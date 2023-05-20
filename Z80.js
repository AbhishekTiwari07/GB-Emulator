const MMU = require('./MMU');

const Z80 = {

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

    _ops:{
        // (LD r, r'): Load r' to r: 01<r><r'>
        LDrr: function(R, _R){
            this._r[`${R}`] = this._r[`${_R}`];
            this._r.m = 1;
            this._r.t = 4;
        },

        // (LD r, n): Load 8-bit integer n to r
        LDrn: function(R){
            this._r[`${R}`] = MMU.rb(this._r.pc);           // Update register after reading value
            this._r.pc += 1;

            this._r.m = 2;                                  // Time taken: 2 M
            this._r.t = 7;                                  // Acc. to Z80 User Manual
        },

        // (LD r, (HL)): 
        LDrHLm: function(R) { 
            this._r[`${R}`] = MMU.rb((this._r.h<<8)+this._r.l);

            this._r.m=2;
            this._r.t = 7;
        },

        // (LD (HL), r): Writing register r to HL
        LDHLmr: function(R) {
            MMU.wb((this._r.h<<8)+this._r.l, this._r[`${R}`]); 
            
            this._r.m = 2;
            this._r.t = 7;
        },



        // (ADD A, r): Adding register 'r' to A
        Addr: function(R){
            let a = this._r.a;                              // copy of A
            let r = this._r[`${R}`];                        // copy of register 'R'
            this._r.a += r;                                 // Addition
            this._r.f = (this._r.a>255)?0x10:0;             // Check for carry

            if(!this._r.a) this._r.f |= 0x80;               // Check for zero 
            if((this._r.a^r^a)&0x10) this._r.f |= 0x20;     // Check for half-carry

            this._r.m = 1;                                  // time taken: 1 M
            this._r.t = 4;
        },
        

        // (CP A, r): Compare register 'r' to A
        CPr: function(R){
            let cmp = this._r.a;                            // copy of a
            let r = this._r[`${R}`];                        // copy of register 'r'
            cmp -= R;                                       // subtract 'R' from A
            cmp &= 255;

            this._r.f = (cmp < 0)? 0x50: 0x40;              // Set Flag Register 'F' after subtraction
            if(!(cmp)) this._r.f |= 0x80;                   // Check for zero
            if((this._r.a^r^cmp)&0x10) this._r.f |= 0x20;   // Check for half-carry

            this._r.m = 1;                                  // time taken: 1 M
            this._r.t = 4;
        },

        // (NOP): No-operation
        NOP: function(){
            this._r.m = 1;                                  // time taken: 1 M
            this._r.t = 4;
        },

        reset: function(){
            this._r = {a: 0, b: 0, d: 0, h: 0, f: 0, c:0, e:0, l:0, pc:0, sp:0, m:0, t:0}
            this._clock = {m:0, t:0}
        }
    }
}


// Test
Z80._r.a = parseInt('0x44', 16);
Z80._r.c = parseInt('0x11', 16);
Z80.Addr('c')

console.log(Z80._r.a.toString(16))