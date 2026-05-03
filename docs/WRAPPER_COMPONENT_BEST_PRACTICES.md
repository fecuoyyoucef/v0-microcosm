# Wrapper Component Best Practices - Prevention Guide

## المشكلة التي حدثت في #722

`TutorialShell` تم تعديله بطريقة خاطئة وحذفت الـ children، مما أدى لاختفاء جميع محتوى الصفحة.

---

## Checklist لأي Wrapper Component

عند كتابة أو تعديل أي wrapper component، تأكد من:

### 1. قبول Children Type
\`\`\`typescript
// ✅ CORRECT
interface WrapperProps {
  children: React.ReactNode
}

function MyWrapper({ children }: WrapperProps) { }

// ❌ WRONG
function MyWrapper() { }
\`\`\`

### 2. إرجاع Children في JSX
\`\`\`typescript
// ✅ CORRECT
return (
  <Provider>
    <Overlay />
    {children}  {/* ← مهم جداً */}
  </Provider>
)

// ❌ WRONG
return (
  <Provider>
    <Overlay />
  </Provider>
)
\`\`\`

### 3. عدم كسر الـ Chain
\`\`\`typescript
// ✅ CORRECT - Chain كامل
<A>
  <B>
    <C>
      <Content /> ← يظهر
    </C>
  </B>
</A>

// ❌ WRONG - C توقف البث
<A>
  <B>
    <C>  {/* لا توجد {children} هنا */}
      {/* Content اختفى! */}
    </C>
  </B>
</A>
\`\`\`

---

## Pattern الصحيح للـ Wrapper

\`\`\`typescript
interface MyWrapperProps {
  children: React.ReactNode
  // + أي props أخرى
}

export function MyWrapper({ children, ...otherProps }: MyWrapperProps) {
  return (
    <OuterProvider {...otherProps}>
      <MiddleLayer>
        <InnerComponent>
          {children}  {/* ← MUST HAVE */}
        </InnerComponent>
      </MiddleLayer>
    </OuterProvider>
  )
}
\`\`\`

---

## أمثلة من Microcosm

### ✓ ScrollProvider (صحيح)
\`\`\`typescript
export function ScrollProvider({ children }: { children: React.ReactNode }) {
  return (
    <ScrollContext.Provider value={scrollValue}>
      {children}  ✓
    </ScrollContext.Provider>
  )
}
\`\`\`

### ✓ FirebasePushProvider (صحيح)
\`\`\`typescript
export function FirebasePushProvider({ 
  userId, 
  children 
}: {
  userId: string
  children: React.ReactNode
}) {
  return (
    <FirebaseContext.Provider value={firebaseValue}>
      {children}  ✓
    </FirebaseContext.Provider>
  )
}
\`\`\`

### ✗ TutorialShell (الخطأ القديم)
\`\`\`typescript
// ❌ BAD - v699-v710
export function TutorialShell() {
  return (
    <>
      <TutorialOverlay />
      <TutorialTooltip />
      {/* NO CHILDREN! ✗ */}
    </>
  )
}
\`\`\`

### ✓ TutorialShell (الإصلاح الجديد)
\`\`\`typescript
// ✅ GOOD - v711+
interface TutorialShellProps {
  children: React.ReactNode
}

export function TutorialShell({ children }: TutorialShellProps) {
  return (
    <>
      <TutorialOverlay />
      <TutorialTooltip />
      {children}  ✓
    </>
  )
}
\`\`\`

---

## قائمة التحقق (Code Review Checklist)

عند مراجعة أي wrapper component:

- [ ] يستقبل `children` كـ prop
- [ ] لديه `children: React.ReactNode` في الـ interface
- [ ] يرجع `{children}` في الـ JSX
- [ ] اختبرت أن المحتوى الداخلي يظهر
- [ ] لا توجد رسائل خطأ في Console
- [ ] الصفحات التي تستخدمه تعمل بشكل صحيح

---

## كيف تكتشف هذه الأخطاء بسرعة؟

### الطريقة 1: Visual Testing
\`\`\`typescript
// اختبر بصرياً أن المحتوى يظهر
<MyWrapper>
  <div style={{ background: 'red', padding: '20px' }}>
    This should be visible
  </div>
</MyWrapper>
\`\`\`

### الطريقة 2: React DevTools
1. افتح React DevTools
2. ابحث عن component هرميته
3. تحقق أن children موجودة في tree

### الطريقة 3: Unit Tests
\`\`\`typescript
describe('MyWrapper', () => {
  it('should render children', () => {
    const { getByText } = render(
      <MyWrapper>
        <span>I should be visible</span>
      </MyWrapper>
    )
    
    expect(getByText('I should be visible')).toBeInTheDocument()
  })
})
\`\`\`

---

## Common Mistakes

### ❌ Mistake 1: نسيان children في JSX
\`\`\`typescript
function BadWrapper({ children }: { children: React.ReactNode }) {
  return <Provider />  {/* children اختفت! */}
}
\`\`\`

### ❌ Mistake 2: إساءة استخدام children
\`\`\`typescript
function BadWrapper({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>  {/* غير موثوق */}
}

// مشكلة: قد تُحذف عن طريق الخطأ
\`\`\`

### ❌ Mistake 3: Conditional rendering خاطئ
\`\`\`typescript
function BadWrapper({ children, condition }: any) {
  if (!condition) return null  {/* children اختفت! */}
  return <Provider>{children}</Provider>
}
\`\`\`

### ✅ Solution: التعامل الآمن
\`\`\`typescript
function GoodWrapper({ 
  children, 
  condition = true 
}: { 
  children: React.ReactNode
  condition?: boolean 
}) {
  return (
    <Provider>
      {condition ? children : <FallbackUI />}  {/* آمن */}
    </Provider>
  )
}
\`\`\`

---

## أفضل الممارسات

### 1. TypeScript: استخدم PropsWithChildren
\`\`\`typescript
import { PropsWithChildren } from 'react'

interface MyWrapperProps extends PropsWithChildren {
  otherProp: string
}

export function MyWrapper({ children, otherProp }: MyWrapperProps) {
  return <div>{children}</div>
}
\`\`\`

### 2. Composition Pattern
\`\`\`typescript
export function MyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Outer>
      <Middle>
        {children}
      </Middle>
    </Outer>
  )
}
\`\`\`

### 3. HOC Pattern
\`\`\`typescript
export function withWrapper<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => (
    <Wrapper>
      <Component {...props} />
    </Wrapper>
  )
}
\`\`\`

---

## Testing Strategy

\`\`\`typescript
// ✅ Minimal test to catch #722 issue
describe('Wrapper Components', () => {
  it('TutorialShell should render children', () => {
    const { container } = render(
      <TutorialShell>
        <div data-testid="child-content">Content</div>
      </TutorialShell>
    )
    
    expect(container.querySelector('[data-testid="child-content"]')).toBeInTheDocument()
  })

  it('AppShell should render children', () => {
    const { getByText } = render(
      <AppShell userId="test" profile={null} groups={[]}>
        <div>Test Child</div>
      </AppShell>
    )
    
    expect(getByText('Test Child')).toBeInTheDocument()
  })
})
\`\`\`

---

## Summary

**أي wrapper component يفشل في إرجاع children سيؤدي إلى مشاكل حرجة مثل #722.**

الحل بسيط: **تأكد دائماً من أن أي wrapper component يستقبل ويرجع children.**
