/********************************
处理前
(function(t,a,b,c,d)
{
   console.log(a[0]+a[1]);
   console.log(b[0]-b[1]);
   console.log(c);
   console.log(d);
   t = 123;

})(5,[1,2],[5,3],6,-5);
处理后
(function (t) {
 console.log(1 + 2);
 console.log(5 - 3);
 console.log(6);
 console.log(-5);
 t = 123;
})(5);
*******************************/
const fs = require("fs")

//把源代码解析成ast
const {parse} = require("@babel/parser");

//遍历节点
const traverse = require("@babel/traverse").default;

//节点的类型判断及构造等操作 主要是对节点进行替换，删除，增加等操作
const types = require("@babel/types");

//将处理完毕的AST转换成JavaScript源代码
const generator = require("@babel/generator").default;

let encode_file = "./encode.js",decode_file = "./decode_result.js";

let jscode = fs.readFileSync(encode_file, {encoding: "utf-8"});

//解析源码成ast(一个json格式的数据结构)
let ast = parse(jscode);


function isBaseLiteral(path) {
	if (path.isLiteral()) {
		return true;
	}
	if (path.isUnaryExpression({ operator: "-" }) ||
		  path.isUnaryExpression({ operator: "+" })) {
		return isBaseLiteral(path.get('argument'));
	}

	return false;
}


const resolveParams =
{
	CallExpression(path) {
		let callee = path.get('callee');
		let arguments = path.get('arguments');
		if (!callee.isFunctionExpression() || arguments.length == 0) {
			return;
		}
		let scope = callee.scope;
		let params = callee.get('params');
		
		
		for (let i in arguments) {
			let paramsPath = params[i];
			let argumentPath = arguments[i];
			const binding = scope.getBinding(paramsPath.node.name);
			if (!binding || !binding.constant) {
				continue;
			}
			
			let canRemoved = true;
            
			for (let referPath of binding.referencePaths) {
                //isBaseLiteral 包含 +- 表达式的判断
				if (argumentPath.isIdentifier() || isBaseLiteral(argumentPath)) {
					referPath.replaceWith(argumentPath.node);
				}
                //如果是数组表达式的话
				else if (argumentPath.isArrayExpression()) {
					let parentPath = referPath.parentPath
					if (!parentPath.isMemberExpression()) {
						referPath.replaceWith(argumentPath.node);
                        break;
					}

                    //拿到[] 里面的值
					let { property } = parentPath.node;
                    //如果属性值不是数字就不能移除
					if (!types.isNumericLiteral(property)) {
						canRemoved = false;
						continue;
					}
                    //拿到参数为数组的下标值
					let index = property.value;
                    //如果下标越界了，则不能替换
					if (index > argumentPath.node.elements.length) {
						canRemoved = false;
						continue;
					}
                    
					parentPath.replaceWith(argumentPath.node.elements[index]);//把成员节点替换成 数组中的元素节点
				}
				else {
					canRemoved = false;
					break;
				}
			}
			if (canRemoved) {
				paramsPath.remove();
				argumentPath.remove();
			}
		}
	},
}

traverse(ast,resolveParams);

let {code} = generator(ast);
console.log(code);