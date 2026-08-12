"""Seed the database with demo user and recommended prompts."""

import asyncio
import uuid

from app.database import async_session, init_db
from app.models import RecommendedPrompt, User
from app.utils import hash_password

RECOMMENDED_PROMPTS = [
    "帮我生成一个手机套餐对比表，包含5个主流运营商的套餐名称、月费、流量、通话分钟数、特色功能，支持按价格筛选排序",
    "做一个话费计算器，用户可以选择套餐、输入使用量（流量GB和通话分钟），自动计算当月费用并给出费用明细",
    "生成一个中秋祝福贺卡页面，可以输入收件人名字，有精美的CSS动画效果（渐变背景、飘落花瓣），温馨的配色",
    "做一个8格幸运转盘抽奖页面，每格有不同奖品和颜色，点击转盘旋转并有逼真的减速动画，中奖后弹出提示",
    "做一个流量使用数据仪表盘，包含环形图（已用vs剩余）、每日流量趋势折线图、统计卡片（总流量、日均、峰值），移动端自适应",
]


async def seed():
    await init_db()

    async with async_session() as db:
        # Check if already seeded
        from sqlalchemy import select

        result = await db.execute(select(RecommendedPrompt).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded, skipping.")
            return

        # Seed demo user (skip if already exists)
        existing_user = await db.execute(
            select(User).where(User.phone == "13800138000")
        )
        if not existing_user.scalar_one_or_none():
            demo_user = User(
                id=str(uuid.uuid4()),
                phone="13800138000",
                password_hash=hash_password("123456"),
                nickname="Demo用户",
                user_type="registered",
            )
            db.add(demo_user)
            print("Seeded: 1 demo user")
        else:
            print("Demo user already exists, skipping.")

        # Seed recommended prompts
        for i, prompt_text in enumerate(RECOMMENDED_PROMPTS, start=1):
            db.add(RecommendedPrompt(prompt=prompt_text, sort_order=i))

        await db.commit()
        print(f"Seeded: {len(RECOMMENDED_PROMPTS)} recommended prompts")
        print("Demo login: phone=13800138000, password=123456")


if __name__ == "__main__":
    asyncio.run(seed())
