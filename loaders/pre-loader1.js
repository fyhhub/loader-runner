function loader(source) {
  console.log('pre-loader1')
  return source
}
loader.pitch = function(remainingRequest, precedingRequest, data) {
  console.log('pre-loader1 pitch');
}
module.exports = loader