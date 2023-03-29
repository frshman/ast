const parser = require("@babel/parser");
const types  = require("@babel/types");
const template = require("@babel/template").default;
const generator = require("@babel/generator").default;

let ast = parser.parse("");
let VAR_NODE = template(`var A = 1,B = 2,C = 3`);
let firstVar = types.identifier('global_0');
let secondVar = types.identifier('global_1');
let thirdVar = types.identifier('global_2');
let newNode = VAR_NODE({A:firstVar,B:secondVar,C:thirdVar});

ast.program.body.push(newNode);

let {code} = generator(ast);

console.log(code);