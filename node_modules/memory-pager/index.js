module.exports = Pager

function Pager (pageSize) {
  if (!(this instanceof Pager)) return new Pager(pageSize)

  this.length = 0
  this.updates = []
  this.pages = new Array(16)
  this.pageSize = pageSize || 1024
}

Pager.prototype.updated = function (page) {
  if (page.updated || !this.updates) return
  page.updated = true
  this.updates.push(page)
}

Pager.prototype.lastUpdate = function () {
  if (!this.updates || !this.updates.length) return null
  var page = this.updates.pop()
  page.updated = false
  return page
}

Pager.prototype.get = function (i, noAllocate) {
  if (i >= this.pages.length) {
    if (noAllocate) return
    this.pages = grow(this.pages, i, this.length)
  }

  var page = this.pages[i]

  if (!page && !noAllocate) {
    page = this.pages[i] = new Page(i, alloc(this.pageSize))
    if (i >= this.length) this.length = i + 1
  }

  return page
}

Pager.prototype.set = function (i, buf) {
  if (i >= this.pages.length) this.pages = grow(this.pages, i, this.length)
  if (i >= this.length) this.length = i + 1

  if (!buf) {
    this.pages[i] = undefined
    return
  }

  var page = this.pages[i]
  var b = truncate(buf, this.pageSize)

  if (page) page.buffer = b
  else this.pages[i] = new Page(i, b)
}

Pager.prototype.toBuffer = function () {
  var list = new Array(this.length)
  var empty = alloc(this.pageSize)

  for (var i = 0; i < list.length; i++) {
    list[i] = this.pages[i] ? this.pages[i].buffer : empty
  }

  return Buffer.concat(list)
}

function grow (list, index, len) {
  var nlen = list.length * 2
  while (nlen <= index) nlen *= 2

  var twice = new Array(nlen)
  for (var i = 0; i < len; i++) twice[i] = list[i]
  return twice
}

function truncate (buf, len) {
  if (buf.length === len) return buf
  if (buf.length > len) return buf.slice(0, len)
  var cpy = alloc(len)
  buf.copy(cpy)
  return cpy
}

function alloc (size) {
  if (Buffer.alloc) return Buffer.alloc(size)
  var buf = new Buffer(size)
  buf.fill(0)
  return buf
}

function Page (i, buf) {
  this.offset = i * buf.length
  this.buffer = buf
  this.updated = false
}
