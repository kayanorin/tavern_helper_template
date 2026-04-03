# -*- coding: utf-8 -*-
"""美食文风量化分析工具 v2 — 对比初版与修订版"""
import re, os, sys

FILES = {
    "deepseek": "deepseek.txt",
    "gemini 2.5 pro": "gemini 2-5pro.txt",
    "gemini 3.1 pro": "gemini 3-1pro.txt",
    "claude opus 4.5": "Claude opus 4-5.txt",
    "claude opus 4.6": "Claude opus 4-6.txt",
    "claude sonnet 4.6": "Claude Sonnet 4-6.txt",
}

BASE = os.path.dirname(os.path.abspath(__file__))

def load(fname):
    path = os.path.join(BASE, fname)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def cn_len(text):
    """Count Chinese characters only."""
    return len(re.findall(r'[\u4e00-\u9fff]', text))

def count_pattern(text, pattern):
    return len(re.findall(pattern, text))

def analyze(name, text):
    clen = cn_len(text)
    results = {"name": name, "字数": clen}

    # 1. 比喻标记词
    xiang = count_pattern(text, r'像[^…。\n]')
    fangfu = count_pattern(text, r'仿佛')
    ruo = count_pattern(text, r'如同')
    simile_total = xiang + fangfu + ruo
    results["像"] = xiang
    results["仿佛"] = fangfu
    results["如同"] = ruo
    results["比喻总计"] = simile_total
    results["比喻密度"] = f"每{clen // simile_total if simile_total else 9999}字" if simile_total else "无"

    # 2. 不是…而是
    neg_aff = count_pattern(text, r'不是.*?(而是|是(?!否))|并非.*?(?:而是|是)|与其说.*?不如')
    results["否定肯定"] = neg_aff

    # 3. 极
    ji = count_pattern(text, r'极(?:其|致|为|度|端|点|简|尽)?[^\u3002\uff0c]{0,6}')
    # more targeted: 极+adj patterns
    ji_adj = count_pattern(text, r'极(?:其|致|为|度|端|点|简|尽|薄|细|长|淡|轻|短|小|大|高|低|快|慢|冷|热|深|浅|强|烈|重|厚)')
    results["极"] = ji
    results["极+形容词"] = ji_adj

    # 4. 某种/某个
    mouzhong = count_pattern(text, r'某[种个]')
    results["某种/某个"] = mouzhong

    # 5. 忽然
    huran = count_pattern(text, r'忽然')
    results["忽然"] = huran

    # 6. 深处
    shenchu = count_pattern(text, r'深处')
    results["深处"] = shenchu

    # 7. 温度（非实指）
    wendu = count_pattern(text, r'温度')
    results["温度"] = wendu

    # 8. 恰到好处
    qdhc = count_pattern(text, r'恰到好处')
    results["恰到好处"] = qdhc

    # 9. 破折号
    dash = count_pattern(text, r'——')
    results["破折号"] = dash

    # 10. 禁用词扫描
    banned = ["沉甸甸", "悄然", "幽微", "氤氲", "妥帖", "绵长"]
    for w in banned:
        c = count_pattern(text, w)
        if c > 0:
            results[f"禁用:{w}"] = c

    # 11. 伪医学词
    med_words = ["肋骨", "胸腔", "气管", "视网膜", "神经末梢", "横膈膜", "食道壁", "食道"]
    for w in med_words:
        c = count_pattern(text, w)
        if c > 0:
            results[f"医学:{w}"] = c

    # 12. 结尾分析 — 取最后两段
    paras = [p.strip() for p in text.strip().split('\n') if p.strip()]
    results["末段"] = paras[-1][:80] + "…" if len(paras[-1]) > 80 else paras[-1]

    # 13. 情绪命名
    emo = count_pattern(text, r'[她他](?:感到|觉得|生出|涌上)(?:一[种股阵])?[^\u3002]{0,8}(?:温暖|失落|释然|不安|复杂|安心|安宁|喜悦|悲伤|难过)')
    results["情绪命名"] = emo

    # 14. 语气标签
    tone = count_pattern(text, r'(?:语气|声音|嗓音|语调)(?:里|中)?(?:带着|透着|含着)')
    results["语气标签"] = tone

    return results

def main():
    all_results = []
    for name, fname in FILES.items():
        text = load(fname)
        if text is None:
            print(f"[跳过] {fname} 不存在")
            continue
        r = analyze(name, text)
        all_results.append(r)

    # Print summary table
    print("=" * 100)
    print("美食文风 v2 量化审查")
    print("=" * 100)

    # Core metrics table
    keys = ["字数", "像", "仿佛", "如同", "比喻总计", "比喻密度", "否定肯定", "极", "某种/某个", "忽然", "深处", "温度", "恰到好处", "破折号", "情绪命名", "语气标签"]
    header = f"{'指标':<12}" + "".join(f"{r['name']:<18}" for r in all_results)
    print(header)
    print("-" * len(header))
    for k in keys:
        row = f"{k:<12}" + "".join(f"{str(r.get(k, 0)):<18}" for r in all_results)
        print(row)

    # Banned/medical words
    print("\n--- 禁用词 & 医学词 ---")
    for r in all_results:
        extras = {k: v for k, v in r.items() if k.startswith("禁用:") or k.startswith("医学:")}
        if extras:
            print(f"  {r['name']}: {extras}")

    # Endings
    print("\n--- 结尾 ---")
    for r in all_results:
        print(f"  [{r['name']}] {r['末段']}")

    print("\n[完成]")

if __name__ == "__main__":
    main()
