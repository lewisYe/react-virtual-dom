
function patch(node, patches) {
  var walker = { index: 0 };
  dfsWalk(node, walker, patches)
}

function dfsWalk(node, walker, patches) {
  var currentPatches = patches[walker.index];

  var len = node.childNodes ? node.childNodes.length : 0;

  for (var i = 0; i < len; i++) {
    var child = node.childNodes[i];
    walker.index++;
    dfsWalk(child, walker, patches);
  }

  if (currentPatches) {
    applyPatches(node, currentPatches)
  }
}

function applyPatches(node, currentPatches) {
  currentPatches.forEach(function (currentPatch) {
    switch (currentPatch.type) {
      case 'REPLACE':
        var newNode = (typeof currentPatch.node === 'string') ? document.createTextNode(currentPatch.node) : currentPatch.node.render()
        node.parentNode.replaceChild(newNode, node);
        break;
      case 'REORDER':
        reorderChildren(node, currentPatch.moves)
        break;
      case 'PROPS':
        setProps(node, currentPatch.props)
        break;
      case 'TEXT':
        if (node.textContent) {
          node.textContent = currentPatch.content;
        } else {
          node.nodeValue = currentPatch.content;
        }
        break
      default:
        throw new Error('Unknown patch type' + currentPatch.type)
        break;
    }
  })
}

function setProps(node, props) {
  for (var key in props) {
    if (props[key] === void 0) {
      node.remmoveAttribute(key)
    } else {
      var value = props[key]
      setAttr(node, key, value)
    }
  }
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

function reorderChildren(node, moves) {
  var staticNodeList = toArray(node.childNodes);
  var maps = {};

  staticNodeList.forEach(function (node) {
    if (node.nodeType === 1) {
      var key = node.getAttribute('key');
      if (key) {
        maps[key] = node;
      }
    }
  })

  moves.forEach(function (move) {
    var index = move.index;
    if (move.type === 0) {
      if (staticNodeList[index] === node.childNodes[index]) {
        node.removeChild(node.childNodes[index])
      }
      staticNodeList.splice(index, 1)
    } else if (move.type === 1) {
      var insertNode = maps[move.item.key] ? maps[move.item.key].cloneNode(true) : (typeof move.item === 'object') ? move.item.render() : document.createTextNode(move.item);
      staticNodeList.splice(index, 0, insertNode)
      node.insertBefore(insertNode, node.childNodes[index] || null)
    }
  })
}
function toArray (listLike) {
  if (!listLike) {
    return []
  }

  var list = []

  for (var i = 0, len = listLike.length; i < len; i++) {
    list.push(listLike[i])
  }

  return list
}