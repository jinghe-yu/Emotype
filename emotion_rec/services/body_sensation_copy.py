"""Body Sense display copy only; IDs, raw input and risk rules stay unchanged."""

REGIONS_ZH = {
    "head": "头部", "eyes": "眼部", "ears": "耳部", "nose_sinus": "鼻部／鼻窦",
    "mouth_jaw": "口腔／下颌", "throat": "喉咙", "chest": "胸部／呼吸", "heart": "心跳",
    "shoulder_neck": "肩颈", "upper_back": "上背", "lower_back": "腰背", "stomach": "胃部／上腹",
    "abdomen": "腹部", "lower_abdomen_pelvis": "下腹／盆腔", "skin": "皮肤",
    "hands": "手部", "legs": "腿部", "whole_body": "全身",
}
POSITIVE_ZH = {
    "clear_head": "头脑清晰", "focused": "专注", "bright_eyes": "眼睛明亮", "voice_clear": "声音通畅",
    "chest_open": "呼吸顺畅", "heart_warm": "心里温暖", "shoulder_relax": "肩膀放松",
    "appetite_good": "食欲好", "stomach_comfy": "胃部舒适", "back_relax": "腰背放松",
    "hands_warm": "手部温暖", "legs_light": "步伐轻盈", "energized": "精力充沛",
    "calm_body": "全身放松", "grounded": "踏实稳定",
}
COPY_ZH = {
    "Reported body region": "所描述的身体部位", "Reported sensation": "所描述的身体感受",
    "Possible connection": "可能的关联", "Attend to this body signal first": "先关注这次身体感受",
    "Check safety first": "先确认身体安全", "Notice your body signals": "留意身体的信号",
    "Some signals need medical assessment rather than being attributed to stress.": "部分信号需要医疗评估，不宜简单归因于压力。",
    "These positive sensations are worth noticing.": "这些积极的身体感受值得留意。",
    "You can observe them without jumping to conclusions about their cause.": "可以先观察变化，不急于判断它们的原因。",
    "This is general guidance based on your reported sensations, not an assessment of their cause.": "这是根据你描述的身体感受提供的一般提醒，并不是对原因的判断。",
    "Possible stress load": "可能的压力负荷",
    "Your words suggest emotional strain. Tension may accompany the sensations, but this does not establish their physical cause.": "你的描述中有情绪紧张的线索。紧张可能伴随身体感受出现，但这不能确定身体不适的原因。",
    "Meal and stress context": "饮食与压力背景",
    "The reported meal, caffeine or stress context may be worth observing alongside digestive sensations, without assuming a cause.": "可以结合你提到的饮食、咖啡因或压力背景观察消化感受，但不据此认定原因。",
    "Energy and hydration context": "精力与饮水背景",
    "If relevant, note sleep, meals, water intake and prolonged focus alongside dizziness. Recurrent or worsening dizziness needs medical assessment.": "如果相关，可记录头晕前后的睡眠、进食、饮水和长时间专注情况。头晕反复出现或加重时应寻求医疗评估。",
    "Body signal observation": "观察身体信号",
    "Observe how these sensations change alongside daily routines. A coincidence is not evidence of a cause.": "观察这些感受如何随日常活动变化；同时发生并不证明因果关系。",
    "Pause your activity if symptoms are significant, sudden or worsening.": "如果症状明显、突然出现或正在加重，先暂停当前活动。",
    "Tell someone you trust what you are experiencing and how long it has lasted.": "告诉你信任的人正在经历什么，以及持续了多久。",
    "Seek urgent medical help for chest pain, difficulty breathing, fainting, severe headache, weakness or numbness.": "出现胸痛、呼吸困难、晕厥、剧烈头痛、无力或麻木等明显症状时，应及时寻求紧急医疗帮助。",
    "Take a short pause from your task and put screens and messages aside.": "短暂暂停当前任务，先放下屏幕和消息。",
    "If comfortable, sip some water and consider whether you need food or a change of position.": "如果舒适，可以小口喝水，并留意是否需要进食或调整姿势。",
    "Breathe gently without forcing a rhythm. Stop if you feel dizzy or uncomfortable.": "自然、轻柔地呼吸，不强迫节奏；若头晕或不舒服，就停止练习。",
    "Choose one manageable next step rather than several tasks at once.": "选择一个容易完成的下一步，不必同时处理许多任务。",
    "Note when the sensation changes and what was happening beforehand.": "记录感受何时变化，以及变化前正在做什么。",
    "Notice where the comfortable sensation is strongest.": "留意舒适的感受在哪个部位最明显。",
    "Record a detail you would like to remember about this moment.": "记下此刻一个你想保留的细节。",
    "Continue a comfortable routine and notice how your body feels later.": "继续让你舒适的日常活动，稍后再留意身体的感受。",
    "Sit somewhere supported and avoid standing suddenly. Seek medical advice if dizziness recurs or worsens.": "先坐在有支撑的位置，避免突然站起；若头晕反复或加重，应咨询医生。",
    "You could note when this sensation was strongest and what was happening beforehand.": "可以记录这种感受何时最明显，以及之前发生了什么。",
    "Consult a clinician if symptoms persist, worsen, recur or make you feel unsafe.": "如果症状持续、加重、反复出现或让你感到不安全，请咨询医疗专业人员。",
    "Seek urgent medical help for chest pain, difficulty breathing, fainting, severe headache, weakness or numbness, bloody stools or high fever.": "出现胸痛、呼吸困难、晕厥、剧烈头痛、无力或麻木、血便或高热等明显症状时，应及时寻求医疗帮助。",
    "Seek medical advice for persistent or worsening symptoms, and urgent help for chest pain, difficulty breathing, fainting, severe headache, weakness or numbness, bloody stools or high fever.": "症状持续或加重时应咨询医生；出现胸痛、呼吸困难、晕厥、剧烈头痛、无力或麻木、血便或高热等明显症状时，应及时寻求医疗帮助。",
    "Chest pain or pressure, difficulty breathing, cold sweats or radiating pain need urgent medical assessment.": "胸痛或压迫感、呼吸困难、冷汗或放射性疼痛需要紧急医疗评估。",
    "Sudden or severe headache with neurological symptoms, fever and a stiff neck, or injury needs urgent medical assessment.": "突然或剧烈头痛伴无力、麻木等神经症状，或伴发热和颈部僵硬，或发生在外伤后，需要紧急医疗评估。",
    "Digestive symptoms with bloody stools, high fever, dehydration or lasting several days need medical assessment.": "消化不适伴血便、高热、脱水，或持续数天时，需要医疗评估。",
    "You rated the sensation as severe; do not assume it is only related to emotional stress.": "你将感受评为严重，不应假定它只是情绪压力引起的。",
    "These reminders do not replace medical assessment. Seek urgent help for significant or worsening symptoms.": "这些提醒不能替代医疗评估。症状明显或加重时，应及时寻求医疗帮助。",
    "This is emotional support, not a diagnosis. No listed warning signs were detected; that does not establish medical safety.": "这是情绪支持，不是诊断。未检出已列出的警示信号，并不代表医学上安全。",
}


def localize_body_values(value, language):
    """Translate only known app copy, never arbitrary model output or private text."""
    if language != "zh":
        return value
    if isinstance(value, str):
        return COPY_ZH.get(value, value)
    if isinstance(value, list):
        return [localize_body_values(item, language) for item in value]
    if isinstance(value, dict):
        return {key: localize_body_values(item, language) for key, item in value.items()}
    return value
