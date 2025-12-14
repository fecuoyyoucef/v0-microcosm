// الملف الشخصي الموسع مع الألقاب والإنجازات
"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Crown, Star, Trophy, TrendingUp, MessageSquare, Lightbulb, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Title {
  id: string
  key: string
  name_ar: string
  name_en: string
  name_fr: string
  description_ar: string
  category: string
  icon: string
  color: string
  rarity: string
  earned_at: string
}

interface UserStats {
  total_points: number
  nodes_created: number
  focused_messages: number
  summaries_created: number
  questions_answered: number
  conflicts_resolved: number
  decisions_voted: number
  messages_sent: number
}

export function ExpandedProfile({ userId, viewerId }: { userId: string; viewerId?: string }) {
  const [titles, setTitles] = useState<Title[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = viewerId ? userId === viewerId : true

  useEffect(() => {
    loadProfileData()
  }, [userId])

  async function loadProfileData() {
    setLoading(true)
    const supabase = createClient()

    // جلب الملف الشخصي
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*, active_title:titles(*)")
      .eq("id", userId)
      .single()

    setProfile(profileData)
    setActiveTitle(profileData?.active_title_id)

    // جلب الألقاب عبر API
    const titlesResponse = await fetch(`/api/profile/titles?userId=${userId}`)
    const titlesData = await titlesResponse.json()
    setTitles(titlesData)

    // جلب الإحصائيات عبر API
    const statsResponse = await fetch(`/api/profile/stats?userId=${userId}`)
    const statsData = await statsResponse.json()
    setStats(statsData)

    setLoading(false)
  }

  async function handleSetActiveTitle(titleId: string) {
    if (!isOwnProfile) return

    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ active_title_id: titleId }).eq("id", userId)

    if (!error) {
      setActiveTitle(titleId)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "leadership":
        return <Crown className="w-4 h-4" />
      case "analysis":
        return <Target className="w-4 h-4" />
      case "initiative":
        return <Lightbulb className="w-4 h-4" />
      case "communication":
        return <MessageSquare className="w-4 h-4" />
      case "wisdom":
        return <Star className="w-4 h-4" />
      default:
        return <Trophy className="w-4 h-4" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "bg-slate-500"
      case "uncommon":
        return "bg-green-500"
      case "rare":
        return "bg-blue-500"
      case "epic":
        return "bg-purple-500"
      case "legendary":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return <div className="p-8 text-center">جارٍ التحميل...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      {/* Header Section */}
      <Card>
        <CardContent className="pt-6">
          {!isOwnProfile && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">تشاهد الملف الشخصي لـ {profile?.display_name}</p>
            </div>
          )}

          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24 ring-4 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">{profile?.display_name?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{profile?.display_name}</h1>
                {profile?.active_title && (
                  <Badge className="gap-1" style={{ backgroundColor: profile.active_title.color }}>
                    <span>{profile.active_title.icon}</span>
                    <span>{profile.active_title.name_ar}</span>
                  </Badge>
                )}
              </div>

              {profile?.bio && <p className="text-muted-foreground mb-4">{profile.bio}</p>}

              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{stats?.total_points || 0}</span>
                  <span className="text-muted-foreground">نقطة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold">{titles.length}</span>
                  <span className="text-muted-foreground">لقب</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="titles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="titles">الألقاب</TabsTrigger>
          <TabsTrigger value="achievements">الإنجازات</TabsTrigger>
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
        </TabsList>

        {/* Titles Tab */}
        <TabsContent value="titles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isOwnProfile ? "ألقابي" : "ألقاب " + profile?.display_name} ({titles.length})
              </CardTitle>
              {isOwnProfile && <CardDescription>اختر اللقب الذي تريد عرضه في ملفك الشخصي</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {titles.map((title: any) => (
                  <Card
                    key={title.id}
                    className={`transition-all ${
                      isOwnProfile ? "cursor-pointer hover:ring-2 hover:ring-primary" : "cursor-default"
                    } ${activeTitle === title.title_id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => isOwnProfile && handleSetActiveTitle(title.title_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{title.title.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{title.title.name_ar}</h3>
                            {getCategoryIcon(title.title.category)}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{title.title.description_ar}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={`text-xs ${getRarityColor(title.title.rarity)}`}>
                              {title.title.rarity}
                            </Badge>
                            {activeTitle === title.title_id && (
                              <Badge variant="default" className="text-xs">
                                نشط
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {titles.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{isOwnProfile ? "لم تحصل على أي ألقاب بعد" : `${profile?.display_name} لم يحصل على ألقاب بعد`}</p>
                  {isOwnProfile && <p className="text-sm">ابدأ بالمساهمة في المجتمع لكسب الألقاب!</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  القيادة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>العقد المنشأة</span>
                    <span className="font-semibold">{stats?.nodes_created || 0}</span>
                  </div>
                  <Progress value={(stats?.nodes_created || 0) * 10} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  التحليل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>الرسائل المركزة</span>
                    <span className="font-semibold">{stats?.focused_messages || 0}</span>
                  </div>
                  <Progress value={Math.min((stats?.focused_messages || 0) * 2.5, 100)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>الملخصات</span>
                    <span className="font-semibold">{stats?.summaries_created || 0}</span>
                  </div>
                  <Progress value={(stats?.summaries_created || 0) * 20} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  التواصل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>الأسئلة المجاب عنها</span>
                    <span className="font-semibold">{stats?.questions_answered || 0}</span>
                  </div>
                  <Progress value={(stats?.questions_answered || 0) * 20} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>الرسائل المرسلة</span>
                    <span className="font-semibold">{stats?.messages_sent || 0}</span>
                  </div>
                  <Progress value={Math.min(stats?.messages_sent || 0, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  الحكمة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>النزاعات المحلولة</span>
                    <span className="font-semibold">{stats?.conflicts_resolved || 0}</span>
                  </div>
                  <Progress value={(stats?.conflicts_resolved || 0) * 20} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي النقاط</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_points || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <TrendingUp className="inline w-3 h-3" /> +5% هذا الأسبوع
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">القرارات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.decisions_voted || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">صوت منجز</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">الرسائل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.messages_sent || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">رسالة مرسلة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">المساهمات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats?.nodes_created || 0) + (stats?.summaries_created || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">عقد وملخصات</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
