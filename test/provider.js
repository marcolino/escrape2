var expect    = require("chai").expect;
var provider = require("../controllers/provider");

describe("Color Code Converter", function() {
  describe("RGB to Hex conversion", function() {
    it("converts the basic colors", function() {
      var redHex   = provider.rgbToHex(255, 0, 0);
      var greenHex = provider.rgbToHex(0, 255, 0);
      var blueHex  = provider.rgbToHex(0, 0, 255);

      expect(redHex).to.equal("ff0000");
      expect(greenHex).to.equal("00ff00");
      expect(blueHex).to.equal("0000ff");
    });
  });

  describe("Hex to RGB conversion", function() {
    it("converts the basic colors", function() {
      var red   = provider.hexToRgb("ff0000");
      var green = provider.hexToRgb("00ff00");
      var blue  = provider.hexToRgb("0000ff");

      expect(red).to.deep.equal([255, 0, 0]);
      expect(green).to.deep.equal([0, 255, 0]);
      expect(blue).to.deep.equal([0, 0, 255]);
    });
  });
});
