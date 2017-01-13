| 变量            |说明             |公式     |
| :------------- | :------------- | :------------- |
|Container Width |画图容器宽度，比如 400px   |`CW 常量`|
|Ticks           |所有项目                  |`T 常量`|
|Tick Count      |项目个数                  |`TC = T.length`|
|Zoom Rate       |横向放大倍数              |`ZR 来自UI交互（缩放）`|
|Show Tick Start |第一个可见项目            |`STS 来自UI交互（拖动）`|
|Show Tick Count |可见项目个数              |STC = TC / ZR|
|Show Ticks      |可见的项目                |ST = `T.slice(STS, STS+STC)`|


## Example

```javascript
CW = 400
T = [1 2 3 4 5 ... 20]
TC = 20
ZR = 2
STS = 4

STC = 20/2 = 10
STS = T.slice(4, 14) = [5...15]
```
