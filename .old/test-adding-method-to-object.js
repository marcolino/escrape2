var Schema = {}
Schema.methods = {};
Schema.methods.base = function($) {
  return 'base';
};

methods = {};
methods.get = function() {
	return 'get';
};
methods.set = function() {
	return 'set';
};

for (var prop in methods) {
  try {
    if (typeof(methods[prop]) == "function") {
      Schema.methods[prop] = methods[prop];
    }
  } catch (err) {
    console.error('property', prop, "is inaccessible");
  };
}

console.log(Schema.methods.base());
console.log(Schema.methods.get());
console.log(Schema.methods.set());