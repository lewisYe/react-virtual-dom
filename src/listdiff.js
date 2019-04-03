
function listDiff(oldList, newList, key) {
  var oldMap = makeKeyIndexAndFree(oldList, key);
  var newMap = makeKeyIndexAndFree(newList, key);

  var newFree = newMap.free;

  var oldKeyIndex = oldMap.keyIndex;
  var newKeyIndex = newMap.keyIndex;

  var moves = []; // 保存所有的操作动作

  var children = [];
  var i = 0;
  var item, itemKey;
  var freeIndex = 0;

  // 对比oldlist 中的节点是否已经在newlist 被 去除
  while (i < oldList.length) {
    item = oldList[i];
    itemKey = getItemKey(item, key); // 获取key对应的值

    if (itemKey) { // 判断值是否为null 或者是void 0
      if (!newKeyIndex.hasOwnProperty(itemKey)) { //值存在的情况下去比较新的key值list中是否也有存在该值   
        children.push(null) // 不存在之间 存入null
      } else {
        var newItemIndex = newKeyIndex[itemKey]; // 如果可以在新的key值list找到改值 取出索引
        children.push(newList[newItemIndex]); // 请list 中 索引对应的 节点放入数组
      }
    } else {
      var freeItem = newFree[freeIndex++];
      children.push(freeItem || null)// 当找不key值 就按照原来的子节点顺序的第一个放入子节点数组中
    }
    i++;
  }

  var simulateList = children.slice(0); // 模拟list
  i = 0;
  // 去除list 中 为null 的项
  while (i < simulateList.length) {
    if (simulateList[i] === null) {
      remove(i);
      removeSimulate(i); // 在simulateList中去除该项
    } else {
      i++;
    }
  }

  // 判断位置顺序的是否改变
  var i = j = 0;
  while (i < newList.length) {
    item = newList[i];
    itemKey = getItemKey(item, key);

    var simulateItem = simulateList[j];
    var simulateItemKey = getItemKey(simulateItem, key);

    if (simulateItem) {
      if (itemKey === simulateItemKey) { // 没有改变
        j++
      } else {
        if (!oldKeyIndex.hasOwnProperty(itemKey)) { // 判断oldlist 是否有改节点 没有就插入新的
          insert(i, item);
        } else {
          var nextItemKey = getItemKey(simulateList[j + 1], key); // 获取后一个节点
          if (nextItemKey === itemKey) {
            remove(i);
            removeSimulate(j);
            j++;
          } else {
            insert(i, item);
          }
        }
      }
    } else {
      insert(i, item)
    }
    i++;
  }

  var k = simulateList.length - j;
  while (j++ < simulateList.length) {
    k--;
    remove(k + i);
  }

  function remove(index) {
    var move = { index: index, type: 0 }
    moves.push(move)
  }

  function removeSimulate(index) {
    simulateList.splice(index, 1)
  }

  function insert(index, item) {
    var move = { index: index, item: item, type: 1 }
    moves.push(move)
  }

  return {
    moves: moves,
    children: children
  }
}





function makeKeyIndexAndFree(list, key) {
  var keyIndex = {};
  var free = [];
  var len = list.length;
  for (var i = 0; i < len; i++) {
    var item = list[i];
    var itemKey = getItemKey(item, key); // 获取key值
    if (itemKey) { // 判断值是否为null 或者是void 0
      keyIndex[itemKey] = i; // 值存在的情况下 用数组维护值对应的 下标
    } else {
      free.push(item)  // 未设置key值时 将子节点按顺序放入数组
    }
  }

  return {
    keyIndex: keyIndex,
    free: free
  }
}


function getItemKey(item, key) {
  if (!item || !key) return void 0;
  return typeof key === 'string' ? item[key] : key(item);
}

