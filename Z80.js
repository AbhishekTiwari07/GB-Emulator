Z80 = {

    // Internal State: clock and Register
    // Track of Overall
    _clock: {
        m: 0,
        t: 0
    },

    _r: {
        // Main Register Set (8-bit): { 4-Accumulators, 4-Flags}
        a: 0, b: 0, d: 0, h: 0, f: 0, c:0, e:0, l:0,

        // Special Purpose Register (16-bit): {Program Counter, Stack Pointer}
        pc:0, sp:0,

        // Track of Last Instruction
        m:0, t:0
    },

    // ADD A, r
    Addr: function(R){
        let a = this._r.a;
        let r = this._r[`${R}`];
        this._r.a += r;
        this._r.f = (this._r.a>255)?0x10:0;

        if(!this._r.a) this._r.f |= 0x80;
        if((this._r.a^r^a)&0x10) this._r.f |= 0x20;
        this._r.m = 1;
        this._r.t = 4;
    },
    

    // Compare register 'r' to A: (CP A, r)
    CPr: function(R){
        let temp = this._r.a;
        temp -= this._r[`${R}`];
        this._r.f |= 0x40;
        if(!(this._r.a & 255)) this._r.f |= 0x80;
        if(this._r.a > 255) this._r.f |= 0x10;
        this._r.m = 1; 
        this._r.t = 4;
    },

    NOP: function(){
        this._r.m = 1;
        this._r.t = 4;
    },

    // Push registers B and C to the stack: (PUSH BC)
    PUSHBC: function(){
        this._r.sp--;
        MMU.wb(this._r.sp, this._r.b);

        this._r.sp--;
        MMU.wb(this._r.sp, this._r.c);

        this._r.m = 3; 
        this._r.t = 3*4;
    },

    // Pop registers H and L from stack: (POP HL)
    POPHL: function() {
        this._r.l = MMU.rb(this._r.sp);
        this._r.sp++;
        this._r.h = MMU.rb(this._r.sp);
        this._r.sp++;
        this._r.m = 3; this._r.t = 12;
    },

    // Read a byte from absolute location into A: (LD A, addr)
    LDAmm: function() {
        var addr = MMU.rw(this._r.pc);
        this._r.pc += 2;
        this._r.a = MMU.rb(addr);
        this._r.m = 4; this._r.t=16;
    },

    reset: function(){
        this._r = {a: 0, b: 0, d: 0, h: 0, f: 0, c:0, e:0, l:0, pc:0, sp:0, m:0, t:0}
        this._clock = {m:0, t:0}
    }
}


// Test
Z80._r.a = parseInt('0x44', 16);
Z80._r.c = parseInt('0x11', 16);
Z80.Addr('c')

console.log(Z80._r.a.toString(16))