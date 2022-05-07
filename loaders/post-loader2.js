function loader(source) {
  console.log('post-loader2')
  return source
}
loader.pitch = function(remainingRequest, precedingRequest, data) {
  console.log('post-loader2 pitch');
}
module.exports = loader