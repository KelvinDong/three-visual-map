import three_visual_map from '../src/index'


test('should output "Hello,world!',()=>{

    console.log = jest.fn();
    three_visual_map()
    expect(console.log).toHaveBeenCalledWith('Hello,world!')

})


// describe('threeVisualMap', () => {
//   it('should outpu "Hello,world!', () => {
//     assert.strictEqual(threeVisualMap.testFunc(), 'Hello,world!')
//   })
// })