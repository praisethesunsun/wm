# 1_crawler_cninfo.py
# 核心逻辑：突破巨潮资讯网反爬限制，批量获取重污染企业年报 PDF
# 注意：2024后巨潮API增加了 Header 校验（mcode 等），本脚本采用更轻量的自动化替代方案或者规避常见墙区。
# 替代低成本建议：对于大批量历史数据，推荐使用 tushare / baostock 接口配合公开数据集，减少直接高频并发请求。

import requests
import time
import os
import random
from urllib.parse import urlencode

# 配置参数
STORAGE_DIR = "./reports_pdf"
os.makedirs(STORAGE_DIR, exist_ok=True)

# 巨潮资讯 API 基础配置
HEADER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "http://www.cninfo.com.cn",
    "Referer": "http://www.cninfo.com.cn/new/commonUrl/pageOfSearch?url=disclosure/list/search",
}

def fetch_report_list(stock_code, page_num=1):
    """
    通过巨潮资讯网高级搜索接口获取年报公告列表
    """
    url = "http://www.cninfo.com.cn/new/hisAnnouncement/query"
    
    # 类别：category_ndbg_szsh (年度报告)
    params = {
        "pageNum": page_num,
        "pageSize": 30,
        "column": "sse",
        "tabName": "fulltext",
        "plate": "",
        "stock": stock_code,
        "searchkey": "",
        "secid": "",
        "category": "category_ndbg_szsh",
        "trade": "",
        "seDate": "2015-01-01~2024-12-31",
        "sortName": "",
        "sortType": "",
        "isHLtitle": "true"
    }

    try:
        response = requests.post(url, headers=HEADER, data=urlencode(params), timeout=10)
        data = response.json()
        return data.get("announcements", [])
    except Exception as e:
        print(f"[{stock_code}] 列表获取失败: {e}")
        return []

def download_pdf(announcement):
    """下载对应的 PDF 文件"""
    title = announcement["announcementTitle"]
    # 规避半年度报告及英文版等非目标文件
    if "摘要" in title or "半年度" in title or "英文" in title or "取消" in title:
        return
        
    adj_url = announcement["adjunctUrl"]
    sec_code = announcement["secCode"]
    sec_name = announcement["secName"]
    date_str = time.strftime("%Y", time.localtime(announcement["announcementTime"]/1000))

    pdf_url = f"http://static.cninfo.com.cn/{adj_url}"
    file_name = f"{sec_code}_{sec_name}_{date_str}.pdf"
    file_path = os.path.join(STORAGE_DIR, file_name)

    if os.path.exists(file_path):
        print(f"[-] {file_name} 已存在，跳过。")
        return

    print(f"[+] 正在下载: {file_name}")
    try:
        resp = requests.get(pdf_url, headers=HEADER, timeout=30)
        with open(file_path, "wb") as f:
            f.write(resp.content)
        # 随机休眠规避 IP 封禁 (ROI极佳的反爬策略)
        time.sleep(random.uniform(2.5, 5.5))
    except Exception as e:
        print(f"下载异常 {file_name}: {e}")

if __name__ == "__main__":
    # 示例重污染企业白名单（此处仅为测试，实际应从 Tushare / MySQL 读取全量 A 股重污染列表）
    target_stocks = ["000001,平安银行", "600519,贵州茅台"] 
    
    for stock in target_stocks:
        print(f"=== 开始采集 {stock} ===")
        # 假设单只股票最多只需要第1页（10年财报不足30条）
        records = fetch_report_list(stock)
        for record in records:
            download_pdf(record)

