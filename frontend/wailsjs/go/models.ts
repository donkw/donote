export namespace util {
	
	export class Response {
	    code: number;
	    msg: string;
	    errMsg: string;
	    data: any;
	
	    static createFrom(source: any = {}) {
	        return new Response(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.msg = source["msg"];
	        this.errMsg = source["errMsg"];
	        this.data = source["data"];
	    }
	}

}

