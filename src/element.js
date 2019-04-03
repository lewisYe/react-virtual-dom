
function Element(type, props, children) {
  this.type = type;
  this.props = props || {};
  this.children = children;
  this.key = props ? props.key : void 0;
  var count = 0;
  children.forEach(function(item,i){
    if(item instanceof Element){
      count += item.count;
    }else{
      children[i] = '' + item
    }
    count ++ ;
  })
  this.count = count;
}

// 创建virtual dom
function createElement(type, props, children) {
  return new Element(type, props, children)
}

// 将js的dom结构 渲染成真实dom
Element.prototype.render = function() {
  var el = document.createElement(this.type); // 根据类型创建节点
  var props = this.props
  // 遍历设置属性
  for (var propsName in props) {
    var propsValue = props[propsName];
    setAttr(el, propsName, propsValue);
  }

  var children = this.children || [];

  children.forEach(function (child) {
    var childEl = (child instanceof Element) ? child.render() : document.createTextNode(child);
    el.appendChild(childEl)
  })

  return el
}

function setAttr(node, key, value) {
  switch (key) {
    case 'value':
      if (node.type.toLowerCase() === 'input' || node.type.toLowerCase() === 'textarea') {
        node.value = value
      } else {
        node.setAttribute(key, value);
      }
      break;
    case 'style':
      node.style.cssText = value;
    default:
      node.setAttribute(key, value);
      break;
  }
}
