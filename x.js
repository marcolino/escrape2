    var personPrototype = {
      name: 'this is the person name value set in prototype',
    };
    
    var person1 = Object.create(personPrototype);
    person1.name = 'Alice';

    person1.func = function() {
      console.log('this object name is:', this.name); // => 'Alice', o.k.
      console.log('this object name is:', personPrototype.name);
    };

person1.func();
