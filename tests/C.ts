class C {
	doesC = () => "C";
}

module C {
	export function createC(): any {
		return new C();
	}
}

export = C;