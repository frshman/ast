// 当一个object里面的value全部为字面量时的还原，没有考虑单个key重新赋值的情况。

// var obj = {"a":123,"b":456,"c":"",};
// var res = obj["a"] + obj["a"] + obj["b"] + obj["c"];
//
// ===>
//
// var res = 123 + 123 + 456 + "";


// 还原思路:
// 1.遍历 VariableDeclarator 节点或者  AssignmentExpression 节点
// 2.判断object里面的value是否全部为字面量
// 3.判断是否被重新赋值
// 4.根据scope来查找其引用的地方，替换
// 5.如果全部进行了还原，删除垃圾代码

function isBaseLiteral(node) {
    if (types.isLiteral(node)) {
        return true;
    }
    if (types.isUnaryExpression(node, {operator: "-"}) ||
        types.isUnaryExpression(node, {operator: "+"})) {
        return isBaseLiteral(node.argument);
    }

    return false;
}


const decodeObject =
{
    VariableDeclarator(path) {
        let { node, scope } = path;
        const { id, init } = node;
        if (!types.isObjectExpression(init)) return;

        let properties = init.properties;
        if (properties.length == 0 || !properties.every(property => isBaseLiteral(property.value)))
            return;

        let binding = scope.getBinding(id.name);

        let { constant, referencePaths, constantViolations } = binding;
        if (!constant) {//新版本的babel库，在循环里面的变量定义，默认非常量
            if (constantViolations.length != 1 || constantViolations[0] != path) //旧版本屏蔽该行即可
          {
             return;
         }
        }

        let newMap = new Map();
        for (const property of properties) {
            let { key, value } = property;
            newMap.set(key.value, value);
        }

        let canBeRemoved = true;
        for (const referPath of referencePaths) {
            let { parentPath } = referPath;
            if (!parentPath.isMemberExpression()) {
                canBeRemoved = false;
                return;
            }

            let AncestorPath = parentPath.parentPath;

            if (AncestorPath.isAssignmentExpression({"left":parentPath.node}))
            {
            	  canBeRemoved = false;
                return;
            }
            if (AncestorPath.isUpdateExpression() && ['++','--'].includes(AncestorPath.node.operator))
            {
            	  canBeRemoved = false;
                return;
            }

            let curKey = parentPath.node.property.value;
            if (!newMap.has(curKey)) {
                canBeRemoved = false;
                break;
            }
            parentPath.replaceWith(newMap.get(curKey));
        }
        canBeRemoved && path.remove();
        newMap.clear();
    },
}


traverse(ast, decodeObject);

console.log(generator(ast).code)