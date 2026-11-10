"""使用說明網頁的截圖：用示範模式（虛構資料）在 390×844 手機畫面逐頁截圖，輸出到 public/guide/img/。
用法：先 npm run dev（或 PORT=3003），再執行
  python scripts/capture-guide.py http://localhost:3003
需要 Python Playwright（含 Chromium）與 Pillow。只用全新的瀏覽器設定檔，不會碰到任何真實健康資料。"""
import io
import os
import sys
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000').rstrip('/')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'guide', 'img')
os.makedirs(OUT, exist_ok=True)
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
results = []


def save(png: bytes, name: str, width=585):
    img = Image.open(io.BytesIO(png)).convert('RGB')
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    path = os.path.join(OUT, name + '.webp')
    img.save(path, 'WEBP', quality=80, method=6)
    results.append((name, os.path.getsize(path)))


def settle(page, ms=500):
    page.wait_for_timeout(ms)


def to_top(page, selector, offset=72):
    """把目標捲到標題列下方（App 的主區塊是自己的捲動容器）。"""
    page.evaluate("""([sel,off])=>{const el=typeof sel==='string'?document.querySelector(sel):sel;const m=document.querySelector('main');
      if(!el||!m)return false;m.scrollTop+=el.getBoundingClientRect().top-off;return true;}""", [selector, offset])
    settle(page, 250)


def to_text(page, text, offset=72, tag='*'):
    ok = page.evaluate("""([text,off,tag])=>{const m=document.querySelector('main');
      const el=[...document.querySelectorAll('main '+tag)].find(e=>e.children.length===0&&e.textContent.trim()===text)||[...document.querySelectorAll('main '+tag)].find(e=>e.textContent.trim().startsWith(text)&&e.textContent.length<text.length+40);
      if(!el)return false;m.scrollTop+=el.getBoundingClientRect().top-off;return true;}""", [text, offset, tag])
    settle(page, 250)
    return ok


def nav(page, label):
    page.locator('nav button:visible, footer button:visible').filter(has_text=label).first.click()
    settle(page, 600)
    page.evaluate("document.querySelector('main').scrollTop=0")


def click_text(page, text, exact=True, scope='main'):
    loc = page.locator(f'{scope} button, {scope} summary, {scope} a').filter(has_text=text)
    if exact:
        loc = page.get_by_role('button', name=text, exact=True) if scope == 'main' else loc
    loc.first.click()
    settle(page)


def shot(page, name):
    save(page.screenshot(), name)


def open_settings_btn(page):
    page.locator('header button[title="設定"]:visible').first.click()


def theme(page, label):
    open_settings_btn(page)
    settle(page)
    page.locator('main button:visible').filter(has_text=label).first.click()
    settle(page, 400)


def run_demo(p):
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA, locale='zh-TW', timezone_id='Asia/Taipei')
    page = ctx.new_page()
    page.goto(BASE + '/?demo=1', wait_until='networkidle')
    settle(page, 1200)
    theme(page, '森林日常')
    nav(page, '總覽')

    def step(name, fn):
        try:
            fn()
        except Exception as err:  # 單張失敗不影響其他截圖
            results.append((name, 'FAILED: ' + str(err).splitlines()[0][:160]))

    # 總覽
    step('overview', lambda: shot(page, 'overview'))
    step('overview-meals', lambda: (to_text(page, '飲食紀錄', tag='h3'), shot(page, 'overview-meals')))
    step('overview-checkin', lambda: (to_text(page, '飲水', tag='h3'), shot(page, 'overview-checkin')))
    def rewards():
        to_text(page, '健康成就', tag='h3')
        page.evaluate("[...document.querySelectorAll('main details')].filter(d=>/徽章與達標條件/.test(d.querySelector('summary')?.textContent||'')).forEach(d=>d.open=true)")
        settle(page, 300)
        shot(page, 'overview-rewards')
    step('overview-rewards', rewards)
    def record_sheet():
        page.locator('button.record-nav').click()
        settle(page, 600)
        shot(page, 'record-sheet')
        page.keyboard.press('Escape')
        settle(page, 300)
        if page.locator('.record-overlay').count():
            page.locator('.record-overlay').click(position={'x': 10, 'y': 10})
            settle(page, 300)
    step('record-sheet', record_sheet)

    # 飲食
    nav(page, '飲食')
    step('food', lambda: shot(page, 'food'))
    def manual():
        page.evaluate("""()=>{const s=[...document.querySelectorAll('main summary, main button')].find(e=>e.textContent.includes('手動記飲食'));
          const d=s?.closest('details');if(d)d.open=true;else s?.click();}""")
        settle(page)
        to_text(page, '手動記飲食／保留照片縮圖', offset=72)
        shot(page, 'food-manual')
    step('food-manual', manual)
    def manage():
        page.evaluate("[...document.querySelectorAll('main details')].filter(d=>(d.querySelector('summary')?.textContent||'').includes('管理今日餐點')).forEach(d=>d.open=true)")
        settle(page, 300)
        to_top(page, "main details[open]", 72)
        page.evaluate("""()=>{const d=[...document.querySelectorAll('main details')].find(d=>(d.querySelector('summary')?.textContent||'').includes('管理今日餐點'));
          const m=document.querySelector('main');m.scrollTop+=d.getBoundingClientRect().top-72;const t=d.querySelector('details');if(t)t.open=true;}""")
        settle(page, 300)
        shot(page, 'food-manage')
    step('food-manage', manage)
    def shopping():
        page.evaluate("document.querySelector('main').scrollTop=0")
        page.locator('main button:visible').filter(has_text='購物與食譜').first.click()
        settle(page, 700)
        shot(page, 'food-shopping')
        page.locator('main button:visible').filter(has_text='餐點分析').first.click()
        settle(page)
    step('food-shopping', shopping)

    # 健康助手
    nav(page, '健康助手')
    step('helper', lambda: shot(page, 'helper'))
    step('helper-sections', lambda: (to_text(page, '用藥與就醫'), shot(page, 'helper-sections')))
    def fasting():
        nav(page, '健康助手')
        page.locator('main button:visible').filter(has_text='營養目標與輕斷食').first.click()
        settle(page, 700)
        shot(page, 'nutrition')
        to_text(page, '輕斷食作息')
        shot(page, 'fasting')
    step('fasting', fasting)
    def vitals():
        nav(page, '健康助手')
        page.evaluate("[...document.querySelectorAll('main details')].filter(d=>(d.querySelector('summary')?.textContent||'').startsWith('生理量測')).forEach(d=>d.open=true)")
        settle(page, 300)
        page.locator('main button:visible').filter(has_text='記錄血壓／血糖').first.click()
        settle(page, 700)
        shot(page, 'vitals')
    step('vitals', vitals)
    def medication():
        nav(page, '健康助手')
        page.locator('main button:visible').filter(has_text='用藥管理').first.click()
        settle(page, 700)
        shot(page, 'medication')
    step('medication', medication)
    def appointments():
        nav(page, '健康助手')
        page.locator('main button:visible').filter(has_text='回診與預約').first.click()
        settle(page, 700)
        shot(page, 'appointments')
    step('appointments', appointments)
    def tools():
        nav(page, '健康助手')
        page.locator('main button:visible').filter(has_text='藥品庫存').first.click()
        settle(page, 700)
        shot(page, 'care-tools')
    step('care-tools', tools)
    def tasks():
        nav(page, '健康助手')
        to_text(page, '快速記錄與待辦')
        shot(page, 'tasks')
    step('tasks', tasks)

    # 運動
    nav(page, '運動')
    step('workout', lambda: shot(page, 'workout'))
    def strength():
        page.locator('main button:visible').filter(has_text='重訓／組數').first.click()
        settle(page, 600)
        page.locator('main button:visible').filter(has_text='啞鈴深蹲').first.click()
        settle(page, 300)
        to_text(page, '重訓／組數')
        shot(page, 'workout-strength')
    step('workout-strength', strength)
    def weekly():
        page.evaluate("document.querySelector('main').scrollTop=0")
        page.locator('main button:visible').filter(has_text='每週課表').first.click()
        settle(page, 600)
        shot(page, 'workout-weekly')
    step('workout-weekly', weekly)
    def history():
        page.locator('main button:visible').filter(has_text='歷史趨勢').first.click()
        settle(page, 700)
        shot(page, 'workout-history')
    step('workout-history', history)
    def practice():
        page.locator('main button:visible').filter(has_text='練習教學').first.click()
        settle(page, 800)
        shot(page, 'workout-practice')
    step('workout-practice', practice)

    # 設定（示範）
    def settings():
        open_settings_btn(page)
        settle(page, 600)
        page.evaluate("document.querySelector('main').scrollTop=0")
        shot(page, 'settings')
        to_text(page, '選一個喜歡的日常')
        shot(page, 'settings-themes')
    step('settings', settings)
    def install():
        page.evaluate("document.querySelector('.install-guide').open=true")
        settle(page, 300)
        to_top(page, '.install-guide', 72)
        shot(page, 'install-guide')
        page.evaluate("document.querySelector('.install-guide').open=false")
    step('install-guide', install)

    # 五種外觀拼圖：每種截總覽上半部
    def themes():
        tiles = []
        for label in ['森林日常', '多彩日常', '小島日常', '甜心日常', '星際科技']:
            theme(page, label)
            nav(page, '總覽')
            tiles.append(Image.open(io.BytesIO(page.screenshot(clip={'x': 0, 'y': 0, 'width': 390, 'height': 700}))).convert('RGB'))
        theme(page, '森林日常')
        w, h = 300, round(300 * tiles[0].height / tiles[0].width)
        gap = 16
        sheet = Image.new('RGB', (w * 5 + gap * 4, h), (246, 247, 241))
        for i, t in enumerate(tiles):
            sheet.paste(t.resize((w, h), Image.LANCZOS), (i * (w + gap), 0))
        buf = io.BytesIO(); sheet.save(buf, 'PNG')
        save(buf.getvalue(), 'themes', width=1560)
    step('themes', themes)
    browser.close()


def run_real(p):
    """正式模式（全新空白資料）：只截設定頁的儲存方式、AI 設定、GAS、備份區塊。不輸入任何金鑰。"""
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA, locale='zh-TW', timezone_id='Asia/Taipei')
    page = ctx.new_page()
    page.goto(BASE + '/', wait_until='networkidle')
    settle(page, 1200)

    def step(name, fn):
        try:
            fn()
        except Exception as err:
            results.append((name, 'FAILED: ' + str(err).splitlines()[0][:160]))

    step('first-run', lambda: shot(page, 'first-run'))
    def open_settings():
        open_settings_btn(page)
        settle(page, 700)
    step('open-settings', open_settings)
    step('settings-storage', lambda: (to_text(page, '資料儲存方式', tag='h3'), shot(page, 'settings-storage')))
    step('settings-ai', lambda: (to_top(page, '.gemini-settings', 72), shot(page, 'settings-ai')))
    def ai_lower():
        page.evaluate("document.querySelector('main').scrollTop+=document.querySelector('.integration-actions').getBoundingClientRect().top-420")
        settle(page, 250)
        shot(page, 'settings-ai-check')
    step('settings-ai-check', ai_lower)
    def gas():
        page.evaluate("document.querySelector('main').scrollTop=0")
        to_text(page, '資料儲存方式', tag='h3')
        page.locator('.storage-mode-options button').filter(has_text='GAS').click()
        settle(page, 500)
        to_top(page, '.gas-settings', 72)
        shot(page, 'settings-gas')
        page.locator('.storage-mode-options button').filter(has_text='存在本機').click()
        settle(page, 400)
    step('settings-gas', gas)
    step('settings-backup', lambda: (to_top(page, '#device-backup', 72), shot(page, 'settings-backup')))
    browser.close()


with sync_playwright() as p:
    run_demo(p)
    run_real(p)

for name, info in results:
    print(f'{name:22} {info}')
failed = [n for n, i in results if isinstance(i, str)]
print('failed:', failed or 'none')
