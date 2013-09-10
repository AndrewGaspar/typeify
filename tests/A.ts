import B = require('B');
import C = require('C');

//import q = require("q");

//q(3).then(console.log);

class A {
	myB: B = new B();
	myC: C = new C();
}

var anA = new A();

console.log(anA.myB.doesB());
console.log(anA.myC.doesC());