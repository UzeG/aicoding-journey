"""Seed the database with initial template data and demo user."""

import asyncio
import uuid

from app.database import async_session, init_db
from app.models import Template, User
from app.utils import hash_password


async def seed():
    await init_db()

    async with async_session() as db:
        # Check if already seeded
        from sqlalchemy import select

        result = await db.execute(select(Template).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded, skipping.")
            return

        # Seed demo user
        demo_user = User(
            id=str(uuid.uuid4()),
            phone="13800138000",
            password_hash=hash_password("123456"),
            nickname="Demo用户",
            user_type="registered",
        )
        db.add(demo_user)

        # Seed 5 templates (matching the product report's preset scenarios)
        templates = [
            Template(
                name="📱 套餐对比表",
                description="生成一个可筛选的 5G 套餐对比页面",
                icon="📱",
                category="practical",
                prompt_hint="做一个移动5G套餐的对比表格，包含套餐名称、价格、流量、通话分钟数，支持按价格筛选",
                sort_order=1,
            ),
            Template(
                name="💰 话费计算器",
                description="选择套餐 + 输入用量，计算总费用",
                icon="💰",
                category="practical",
                prompt_hint="做一个话费计算器，用户可以选择不同的5G套餐，输入流量使用量和通话分钟数，自动计算当月总费用",
                sort_order=2,
            ),
            Template(
                name="🎂 祝福贺卡",
                description="输入名字，生成带动画的祝福页面",
                icon="🎂",
                category="fun",
                prompt_hint="做一个生日祝福贺卡页面，可以输入寿星的名字，有好看的动画效果和温暖的祝福语",
                sort_order=3,
            ),
            Template(
                name="🎮 抽奖转盘",
                description="8 格转盘随机抽奖，互动性最强",
                icon="🎮",
                category="fun",
                prompt_hint="做一个8格的幸运抽奖转盘，点击按钮开始旋转，随机停在一个奖项上，显示中奖结果",
                sort_order=4,
            ),
            Template(
                name="📊 流量可视化",
                description="环形图 + 柱状图展示流量使用情况",
                icon="📊",
                category="practical",
                prompt_hint="做一个流量使用数据看板，包含环形图显示已用和剩余流量、柱状图显示每日用量趋势、统计卡片显示总量和平均值，使用ECharts实现",
                sort_order=5,
            ),
        ]
        for t in templates:
            db.add(t)

        await db.commit()
        print(f"Seeded: 1 demo user + {len(templates)} templates")
        print("Demo login: phone=13800138000, password=123456")


if __name__ == "__main__":
    asyncio.run(seed())
