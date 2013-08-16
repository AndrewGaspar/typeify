class B {
	doesB = () => "B";
}

module B {
	export function createB(): any {
		return new B();
	}
}

export = B;