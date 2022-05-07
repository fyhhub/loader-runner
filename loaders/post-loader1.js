function loader(source) {
  console.log('post-loader1')
  return source
}
loader.pitch = function(remainingRequest, precedingRequest, data) {
  console.log('post-loader1 pitch');
}
module.exports = loader