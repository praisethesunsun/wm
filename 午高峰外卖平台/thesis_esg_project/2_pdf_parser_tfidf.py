# 2_pdf_parser_tfidf.py
# 核心逻辑：PDF解析，清洗文本，计算ESG维度的 TF-IDF 分数。
# 依赖：pdfplumber, jieba, scikit-learn, pandas

import os
import re
import pdfplumber
import jieba
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

# 1. 字典构建 (基于最新文献标准)
E_KEYWORDS = ["环保", "减排", "低碳", "污染治理", "新能源", "绿色", "碳中和", "碳达峰", "生态", "循环利用"]
S_KEYWORDS = ["扶贫", "捐赠", "公益", "员工福利", "职业健康", "安全生产", "社会责任", "乡村振兴"]
G_KEYWORDS = ["内控", "审计", "独立董事", "公司治理", "反腐", "透明度", "股东权益", "风险控制"]

# 合并所有特征词用于强制 TF-IDF 识别
ALL_KEYWORDS = E_KEYWORDS + S_KEYWORDS + G_KEYWORDS

def clean_text(text):
    """文本深度清洗，去除非汉字/非字母数字的噪音"""
    if not text:
        return ""
    # 去除各种空白符、乱码
    text = re.sub(r'\s+', '', text)
    # 仅保留中文字符、字母和数字 (去除图表转化后的特殊符号残余)
    text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', text)
    return text

def extract_text_from_pdf(pdf_path):
    """
    考虑到效率与内存，去除页眉页脚、表格区域的干扰。
    """
    full_text = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # 抽样/全量读取。测试可仅读前50页
            for page in pdf.pages:
                # 裁剪：略过顶部和底部的 10% (通常是页眉页脚)
                bounding_box = (
                    0, 
                    float(page.height) * 0.1, 
                    float(page.width), 
                    float(page.height) * 0.9
                )
                cropped_page = page.crop(bounding_box)
                
                # 抽取文本，忽略表格排版问题
                text = cropped_page.extract_text(x_tolerance=2, y_tolerance=3)
                if text:
                    full_text.append(clean_text(text))
    except Exception as e:
        print(f"解析 {pdf_path} 失败: {e}")
        return ""
        
    return "".join(full_text)

def calculate_esg_tfidf(corpus_dict):
    """
    corpus_dict: { "000001_2022": "全文文本...", "600519_2022": "全文文本..." }
    """
    # 让 Jieba 强制记住我们的核心词汇，防止被切碎 (如“碳中和”绝不能变成“碳”和“中和”)
    for word in ALL_KEYWORDS:
        jieba.add_word(word)
        
    doc_ids = list(corpus_dict.keys())
    documents = []
    
    print("[*] 正在进行 Jieba 分词...")
    for doc_id in doc_ids:
        raw_text = corpus_dict[doc_id]
        # 分词并用空格相连，满足 sklearn 格式
        seg_list = set(jieba.cut(raw_text)) # 使用 set 提升速度，或 list 保留词频。TF-IDF 需要真实词频，所以用 list
        seg_text = " ".join(jieba.cut(raw_text))
        documents.append(seg_text)

    print("[*] 正在构建 TF-IDF 矩阵...")
    # vocabulary=ALL_KEYWORDS 强制向量机只计算我们关心的这些词维度，极大地减少内存和算力消耗！
    vectorizer = TfidfVectorizer(vocabulary=ALL_KEYWORDS, stop_words=None)
    tfidf_matrix = vectorizer.fit_transform(documents)
    
    # 转化为 DataFrame
    df_tfidf = pd.DataFrame(tfidf_matrix.toarray(), columns=vectorizer.get_feature_names_out())
    df_tfidf['doc_id'] = doc_ids
    
    # 聚合 E, S, G 分数
    df_tfidf['E_Score'] = df_tfidf[E_KEYWORDS].sum(axis=1)
    df_tfidf['S_Score'] = df_tfidf[S_KEYWORDS].sum(axis=1)
    df_tfidf['G_Score'] = df_tfidf[G_KEYWORDS].sum(axis=1)

    # 仅提取我们需要的结果列
    result_df = df_tfidf[['doc_id', 'E_Score', 'S_Score', 'G_Score']]
    return result_df

if __name__ == "__main__":
    test_dir = "./reports_pdf"
    corpus = {}
    
    # 扫描测试目录
    if os.path.exists(test_dir):
        for fname in os.listdir(test_dir):
            if fname.endswith(".pdf"):
                fpath = os.path.join(test_dir, fname)
                doc_id = fname.replace(".pdf", "")
                print(f"抽取内容: {doc_id}")
                corpus[doc_id] = extract_text_from_pdf(fpath)
                
        if corpus:
            final_scores = calculate_esg_tfidf(corpus)
            print("\n最终计算结果:")
            print(final_scores)
            # final_scores.to_csv("esg_scores.csv", index=False)
    else:
        print(f"请先运行爬虫脚本补充数据至 {test_dir} 目录")
