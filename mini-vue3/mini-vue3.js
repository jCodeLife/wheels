// `reactive`接受一个对象`obj`，返回包装后的响应式数据
function reactive(obj) {
    // Vue3中基于Proxy实现响应式。作用是所以当数据发生变化时，我们可以拦截到并作出一些操作，比如更新UI视图，即数据响应式
    return new Proxy(obj, {
        get(target, key) {
            // 可以做依赖收集
            track(target, key)
            return target[key]
        },
        set(target, key, val) {
            target[key] = val
            // 这里当数据变化时，更新界面，于是我们可以创建一个update方法，并在这里调用
            // updata()
            // app.update()
            //这有个问题，app耦合了，没有通用性
            // 为了解决这个问题
            // 我们希望有一条神秘的线，当一个数据发生变化，我一定要知道更新的是哪个对应的函数。
            // 因此，我们需要一个依赖收集的过程，或者叫添加副作用，即数据发生改变，产生一个副作用

            // 触发依赖
            trigger(target, key)
        }
    })
}
//effectStack用于临时存储fn，将来在做依赖收集的时候把它拿出来，拿出来跟它相关的数据相映射
const effectStack = [];
// 添加副作用函数fn
function effect(fn) {
    // effect的作用是将传入的fn作为副作用函数，如果fn使用到了一些响应式数据，当数据发生变化，这个副作用函数fn将再次执行
    const eff = function () {
        try {
            effectStack.push(eff)
            fn()
        } finally {
            effectStack.pop();
        }
    }//eff的作用是处理错误，入栈，执行函数，出栈
    // 执行一次，触发依赖收集
    eff();
    return eff
}

// 依赖收集函数,希望在副作用函数执行时，去触发track
// track的作用是接受target、key,让traget[key]和副作用函数eff建立一个映射关系
// 所以，我建立一个数据结构，来存储这个映射关系
const targetMap = {}//大概结构是这样的{target: {key:[eff]}}
function track(target, key) {
    // 获取副作用函数
    const effect = effectStack[effectStack.length - 1]
    // 建立target和key和eff关系
    if (effect) {
        console.log(targetMap)
        let map = targetMap[target]
        if (!map) {
            map = targetMap[target] = {}
        }
        let deps = map[key]
        if (!deps) {
            deps = map[key] = []
        }
        // 将副作用函数放入deps
        if (deps.indexOf(effect) === -1) {
            deps.push(effect)
        }
    }
}

function trigger(target, key) {
    const map = targetMap[target]
    if (map) {
        const deps = map[key]
        if (deps) {
            deps.forEach(dep => dep());
        }
    }
}

const Vue = {
    createApp(ops) {
        const renderer = Vue.createRenderer({
            querySelector(selector) {
                return document.querySelector(selector)
            },
            insert(child, parent, anchor) {
                parent.insertBefore(child, anchor || null)
            }
        })
        return renderer.createApp(ops)
    },
    createRenderer({ querySelector, insert }) {
        return {
            createApp(ops) {
                return {
                    mount(selector) {
                        const parent = querySelector(selector)
                        if (!ops.render) {
                            ops.render = this.compile(parent.innerHTML)
                        }
                        if (ops.setup) {
                            // 经过上面修改，this.setupState已经是响应式对象
                            this.setupState = ops.setup()
                        } else {
                            this.data = ops.data();
                        }
                        this.proxy = new Proxy(this, {
                            get(target, key) {
                                if (key in target.setupState) {
                                    return target.setupState[key]
                                } else {
                                    return target.data[key]
                                }
                            },
                            set(target, key, val) {
                                if (key in target.setupState) {
                                    target.setupState[k] = val
                                } else {
                                    target.data[key] = val
                                }
                            }
                        })
                        // 封装一个update方法，当数据变化时调用，即用于更新和初始化
                        this.update = effect(() => {
                            // 得到最新的元素、清空、追加
                            const el = ops.render.call(this.proxy)
                            parent.innerHTML = ''
                            insert(el, parent)
                        })
                        // 在初始化是需要先执行一次
                        // this.update()//没必要了
                    },
                    compile(template) {
                        return function render() {
                            const h1 = document.createElement('h1')
                            h1.textContent = this.count
                            return h1;
                        }
                    }
                }
            }
        }
    }
}