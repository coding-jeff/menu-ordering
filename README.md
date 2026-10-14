# 拾味 · 在线菜单与点单

第一期 C 端菜单查看和下单 MVP。访客可以按分类浏览、搜索菜品、调整购物袋，并提交订单。菜单及订单保存在 Supabase PostgreSQL 中；数据库只使用三张业务表：`menus`、`orders`、`order_menus`。

## 本地运行

需要 Node.js 22.19+。

```sh
npm install
cp .env.example .env.local
npm run dev
```

没有配置 Supabase 时，页面使用演示菜单；下单仅显示演示提示，不会写入数据库。连接数据库后，在 `.env.local` 填入项目 URL 和 publishable key。不要将 `service_role` 或 secret key 放进浏览器环境变量。

## 部署

仓库配置了 GitHub Pages 自动部署。首次部署前，在 GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**；随后 `main` 分支每次更新都会构建并发布到 `https://coding-jeff.github.io/menu-ordering/`。

## 数据库

迁移文件：`supabase/migrations/20261012000000_menu_ordering.sql`。在 Supabase SQL Editor 执行，或通过 Supabase CLI 迁移。它创建三张表、索引、RLS 策略、演示菜品，并创建一个窄权限的 `place_order` PostgreSQL 函数：该函数从数据库读取菜单价格，在同一事务里保存订单及订单菜品快照，避免前端伪造金额或产生只写入一半的订单。匿名前端只获准调用此函数，无权直接插入订单或篡改订单状态。

公开访客可读取上架菜单并提交新订单；没有订单列表读取策略，因此匿名访客不能通过 Data API 查询已有订单。第一期未包括后台菜单管理、订单状态管理、用户登录、付款或配送。

## 当前实现

- 响应式菜单主页、分类筛选、菜品搜索
- 点单袋数量调整和备注
- 数据库订单提交及订单编号提示
- 未配置数据库时的演示模式
