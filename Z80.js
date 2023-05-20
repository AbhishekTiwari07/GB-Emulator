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

        // (LD r, (HL)): Load memory at address specified by HL to register r
        LDrHLm: function(R) { 
            this._r[`${R}`] = MMU.rb((this._r.h<<8)+this._r.l);

            this._r.m=2;
            this._r.t = 7;
        },

        // (LD (HL), r): Load register r to address specified by HL
        LDHLmr: function(R) {
            MMU.wb((this._r.h<<8)+this._r.l, this._r[`${R}`]); 

            this._r.m = 2;
            this._r.t = 7;
        },

        // (LD (HL), n): Load 8-bit interget to address specified by HL
        LDHLmn: function(){
            MMU.wb((this._r.h<<8)+this._r.l, MMU.rb(this._r.pc));
            this._r.pc += 1;

            this._r.m = 3;
            this._r.t = 9;
        },

        LDBCmA: function(){
            MMU.wb((this._r.b<<8)+this._r.c, this._r.a);
            this._r.m = 2;
            this._r.t = 7;
        },

        LDDEmA: function(){
            MMU.wb((this._r.d<<8)+this._r.e, this._r.a);
            this._r.m = 2;
            this._r.t = 7;
        },

        // LD (nn), A): Load register A to address specified by n
        LDmmA: function() { 
            MMU.wb(MMU.rw(this._r.pc), this._r.a);
            this._r.pc += 2; 
            this._r.m = 4; 
        },

        // LD A, (BC)):
        LDABCm: function(){
            this._r.a = MMU.rb((this._r.b<<8)+this._r.c);
            this._r.m = 2;
        },

        // LD A, (DE)): 
        LDADEm: function(){
            this._r.a = MMU.rb((this._r.d<<8)+this._r.e);
            this._r.m = 2;
        },

        // LD A, (nn):
        LDAmm: function(){
            this._r.a = MMU.rb(MMU.rw(this._r.pc));
            this._r.pc += 2;
            this._r.m = 4;
        },

        LDBCnn: function() { 
            this._r.c = MMU.rb(this._r.pc); 
            this._r.b = MMU.rb(this._r.pc+1); 
            this._r.pc += 2; 
            this._r.m = 3; 
        },

        LDDEnn: function() { 
            this._r.e = MMU.rb(this._r.pc); 
            this._r.d = MMU.rb(this._r.pc+1); 
            this._r.pc += 2; 
            this._r.m = 3; 
        },

        LDHLnn: function() { 
            this._r.l = MMU.rb(this._r.pc); 
            this._r.h = MMU.rb(this._r.pc+1); 
            this._r.pc += 2; 
            this._r.m = 3; 
        },

        LDSPnn: function() { 
            this._r.sp = MMU.rw(this._r.pc); 
            this._r.pc += 2; 
            this._r.m = 3; 
        },

        // (LD (HL), n):
        LDHLmm: function(){
            let addr = MMU.rw(this._r.pc);
            this._r.pc += 2;

            this._r.l = MMU.rb(addr);
            this._r.h = MMU.rb(addr+1);

            this._r.m += 5;
        },

        // (LD n, (HL)):
        LDmmHL: function(){
            let addr = MMU.rw(this._r.pc);
            this._r.pc += 2;

            MMU.ww(addr, (this._r.h<<8)+this._r.l);
            
            this._r.m += 5;
        },

        LDHLIA: function(){
            MMU.wb((this._r.h<<8)+this._r.l, this._r.a);
            this._r.l = (this._r.l+1)&255;
            if(!this._r.l) 
                this._r.h=(this._r.h+1)&255; 
            this._r.m=2;
        },

        LDAHLI: function(){
            this._r.a = MMU.rb((this._r.h<<8)+this._r.l);
            this._r.l = (this._r.l+1)&255;
            if(!this._r.l) 
                this._r.h=(this._r.h+1)&255; 
            this._r.m=2;
        },

        LDHLDA: function(){
            MMU.wb((this._r.h<<8)+this._r.l, this._r.a);
            this._r.l = (this._r.l-1)&255;
            if(this._r.l==255) 
                this._r.h = (this._r.h-1)&255;
            this._r.m=2;
        },

        LDAHLD: function(){
            this._r.a = MMU.rb((this._r.h<<8)+this._r.l);
            this._r.l = (this._r.l-1)&255;
            if(this._r.l==255) 
                this._r.h = (this._r.h-1)&255;
            this._r.m=2;
        },

        LDAIOn: function() { 
            this._r.a = MMU.rb(0xFF00+MMU.rb(this._r.pc)); 
            this._r.pc++; 
            this._r.m=3; 
        },

        LDIOnA: function() { 
            MMU.wb(0xFF00+MMU.rb(this._r.pc),this._r.a); 
            this._r.pc++; 
            this._r.m=3; 
        },

        LDAIOC: function() { 
            this._r.a=MMU.rb(0xFF00+this._r.c); 
            this._r.m=2; 
        },

        LDIOCA: function() { 
            MMU.wb(0xFF00+this._r.c, this._r.a); 
            this._r.m=2; 
        },

        LDHLSPn: function() { 
            var i = MMU.rb(this._r.pc); 
            if(i>127) i=-((~i+1)&255); 
            this._r.pc++; 
            i += this._r.sp; 
            this._r.h = (i>>8)&255; 
            this._r.l = i&255; 
            this._r.m=3; 
        },

        // CB
        SWAPr: function(R) { 
            var tr = this._r[`${R}`]; 
            this._r[`${R}`] = ((tr&0xF)<<4)|((tr&0xF0)>>4); 
            this._r.f = this._r[`${R}`]?0:0x80;
            this._r.m = 1; 
        },


        // -------------------------------------------- Data Processing ------------------------------------------------
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