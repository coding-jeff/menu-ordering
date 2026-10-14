# 拾味 · 在线菜单与点单

第一期 C 端菜单查看和下单 MVP。访客可以按分类浏览、搜索菜品、调整购物袋，并提交订单。菜单及订单保存在 Supabase PostgreSQL 中；数据库只使用三张业务表：`menus`、`orders`、`order_menus`。

## 本地运行

需要 Node.js 22.19+。

```sh
npm install
cp .env.example .env.local
npm run dev
```

未配置 Supabase 时，页面使用演示菜单；下单仅显示演示提示。数据库迁移位于 `supabase/migrations/20261012000000_menu_ordering.sql`。

第一期包含菜单浏览、分类筛选、搜索、点单袋和订单提交；暂不包含后台菜单管理、订单状态管理、用户登录、付款或配送。
