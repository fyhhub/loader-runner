function loader(source) {
  const callback = this.async()
  setTimeout(() => {
    callback(null, source) // 等同于this.callback
  }, 2000)
}
loader.pitch = function(remainingRequest, precedingRequest, data) {
}
module.exports = loader