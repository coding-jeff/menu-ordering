create table public.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  badge text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 40),
  note text check (note is null or char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create table public.order_menus (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_id uuid not null references public.menus(id),
  menu_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total numeric(10, 2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now()
);

create index menus_available_sort_idx on public.menus (is_available, sort_order, created_at);
create index orders_created_at_idx on public.orders (created_at desc);
create index order_menus_order_id_idx on public.order_menus (order_id);

alter table public.menus enable row level security;
alter table public.orders enable row level security;
alter table public.order_menus enable row level security;

grant select on public.menus to anon, authenticated;
grant usage on schema public to anon, authenticated;

create policy "Anyone can view available menu items"
  on public.menus for select to anon, authenticated
  using (is_available);

create policy "Guests can place orders"
  on public.orders for insert to anon, authenticated
  with check (true);

create policy "Guests can add order items"
  on public.order_menus for insert to anon, authenticated
  with check (true);

create or replace function public.place_order(p_customer_name text, p_note text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_total numeric(10, 2);
  v_item_count integer;
begin
  if char_length(trim(coalesce(p_customer_name, ''))) not between 1 and 40 then
    raise exception '请填写有效称呼（1-40 个字符）';
  end if;
  if p_note is not null and char_length(p_note) > 200 then
    raise exception '备注不能超过 200 个字符';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception '点单内容格式不正确';
  end if;

  select count(*), coalesce(sum(m.price * item.quantity), 0)
    into v_item_count, v_total
  from jsonb_to_recordset(p_items) as item(menu_id uuid, quantity integer)
  join public.menus m on m.id = item.menu_id and m.is_available
  where item.quantity between 1 and 99;

  if v_item_count = 0 or v_item_count <> jsonb_array_length(p_items) then
    raise exception '菜单已更新，请检查点单内容后重试';
  end if;

  insert into public.orders (id, customer_name, note, total_amount)
  values (v_order_id, trim(p_customer_name), nullif(trim(coalesce(p_note, '')), ''), v_total);

  insert into public.order_menus (order_id, menu_id, menu_name, unit_price, quantity)
  select v_order_id, m.id, m.name, m.price, item.quantity
  from jsonb_to_recordset(p_items) as item(menu_id uuid, quantity integer)
  join public.menus m on m.id = item.menu_id and m.is_available
  where item.quantity between 1 and 99;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(text, text, jsonb) from public;
grant execute on function public.place_order(text, text, jsonb) to anon;

insert into public.menus (name, description, category, price, badge, sort_order) values
  ('炙烤和牛饭', '谷饲和牛 · 温泉蛋 · 秘制照烧汁', '主食', 48.00, '人气招牌', 1),
  ('松露蘑菇意面', '黑松露 · 口蘑 · 帕玛森芝士', '主食', 42.00, '主厨推荐', 2),
  ('香煎鸡腿沙拉', '低温慢煮鸡腿 · 牛油果 · 蜂蜜芥末', '轻食', 36.00, null, 3),
  ('南法番茄汤', '慢熬番茄 · 罗勒 · 香烤酸面包', '轻食', 22.00, null, 4),
  ('桂花乌龙冷萃', '凤凰单丛 · 丹桂 · 低温冷萃', '饮品', 18.00, null, 5),
  ('海盐焦糖布丁', '每日现烤 · 海盐焦糖 · 香草籽', '甜品', 20.00, null, 6);
