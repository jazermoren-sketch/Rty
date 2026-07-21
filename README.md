# Shop Bot - Phase 7 FIXED

## Marketplace Message System

### إعداد القنوات

```text
/marketplace channel-add
/marketplace channel-remove
/marketplace channel-list
```

بعد اختيار `channel` من الأمر، تتم إضافة القناة أو إزالتها.

### الرسائل

أي رسالة داخل قناة Marketplace يتم:
- حذف الرسالة الأصلية.
- إعادة نشرها عبر Webhook.
- استخدام اسم المستخدم وصورته.
- إضافة Banner المستخدم إن كان متاحاً.
- تحويل النص إلى Hybrid Franco.

### Hybrid Franco

```text
ق -> 9
ح -> 7
ع -> 3
خ -> 5
ط -> 6
غ -> 8
ش -> ch أو sh
ت -> T أو t
```

النص يبقى عربياً ويتم تحويل بعض الحروف فقط.

### مهم

يجب تفعيل **Message Content Intent** في Discord Developer Portal لأن البوت يقرأ رسائل Marketplace.

التشغيل:

```bash
npm install
node index.js
```
