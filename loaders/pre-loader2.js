function loader(source) {
  console.log('pre-loader2')
  return source
}
loader.pitch = function(remainingRequest, precedingRequest, data) {
  console.log('pre-loader2 pitch');
}
module.exports = loader