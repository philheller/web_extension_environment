const { add } = require("./contentScript");

describe("Testing func add", () => {
  test("Testing func add with 2 + 5 = 7", () => {
    expect(add(2, 5)).toBe(7);
  });

  test("Testing func add with 2 + 5 = 7", () => {
    expect(add(null, 5)).toBe(5);
  });
});
