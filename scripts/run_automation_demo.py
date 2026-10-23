import asyncio
import time
from playwright.async_api import async_playwright

async def run():
    print("=================================================================")
    # Maximize the window and launch headed browser (visible to user)
    print("Launching headed browser for Intelligent Workspace...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--start-maximized", "--no-sandbox"]
        )
        context = await browser.new_context(no_viewport=True)
        page = await context.new_page()
        
        url = "http://localhost:5173/editor"
        print(f"Navigating to: {url} ...")
        await page.goto(url)
        
        # Wait for the page and Monaco editor to initialize
        print("Waiting for Monaco Editor to load...")
        await page.wait_for_selector(".monaco-editor")
        await page.wait_for_timeout(2000)
        
        # Target the Monaco Editor's input textarea
        editor_textarea = page.locator(".monaco-editor textarea")
        await editor_textarea.focus()
        
        # Clear the default code draft
        print("Clearing default code in editor...")
        await page.keyboard.press("Control+KeyA")
        await page.keyboard.press("Backspace")
        await page.wait_for_timeout(500)
        
        # Code to type
        code_to_write = (
            "def solve():\n"
            "    print('Hello World! Connecting to local engine...')\n"
            "    for i in range(1, 6):\n"
            "        print(f'Running step {i}/5...')\n"
            "    print('Execution complete!')\n"
            "\n"
            "solve()\n"
        )
        
        print("Simulating real user typing rhythm into Monaco editor...")
        # Type the code with a realistic human keypress delay
        await editor_textarea.press_sequentially(code_to_write, delay=40)
        await page.wait_for_timeout(1000)
        
        # Locate the Execute button
        execute_button = page.get_by_role("button", name="Execute")
        print("Clicking 'Execute' button...")
        await execute_button.click()
        
        print("Waiting for local execution engine logs...")
        # Let's wait up to 10 seconds to watch the output print
        for _ in range(10):
            await page.wait_for_timeout(1000)
            
        print("\n=======================================================")
        print("AUTOMATION COMPLETE SUCCESSFULLY!")
        print("Keeping the browser window open for 15 more seconds...")
        print("=======================================================\n")
        
        await page.wait_for_timeout(15000)
        print("Closing browser window.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
