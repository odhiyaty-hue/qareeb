import { useAuth } from "@/lib/auth";
import { useListMyRequests, useListMyHelpActions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, ShieldAlert, LogOut, Calendar } from "lucide-react";
import { RequestCard } from "@/components/request-card";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function Profile() {
  const { user, logout } = useAuth();
  
  const { data: myRequests, isLoading: isLoadingRequests } = useListMyRequests();
  const { data: myHelps, isLoading: isLoadingHelps } = useListMyHelpActions();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold">حسابي</h1>
        <Button variant="outline" onClick={logout} className="text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          تسجيل الخروج
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <div className="text-muted-foreground text-sm">{user.email}</div>
            <div className="flex gap-2 items-center">
              {user.trustStatus === 'trusted' && (
                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">
                  <ShieldCheck className="w-3 h-3 ml-1" /> موثوق
                </Badge>
              )}
              {user.trustStatus === 'new' && (
                <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200">
                  <Clock className="w-3 h-3 ml-1" /> جديد
                </Badge>
              )}
              {user.trustStatus === 'restricted' && (
                <Badge variant="destructive" className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200">
                  <ShieldAlert className="w-3 h-3 ml-1" /> مقيد
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="requests">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="requests" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-6 py-3"
          >
            طلباتي
          </TabsTrigger>
          <TabsTrigger 
            value="helps" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-6 py-3"
          >
            مساعداتي
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests" className="pt-6">
          {isLoadingRequests ? (
            <div className="text-center text-muted-foreground py-12">جاري التحميل...</div>
          ) : !myRequests?.length ? (
            <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
              <h3 className="text-lg font-medium mb-2">لم تقم بنشر أي طلب مساعدة بعد</h3>
              <p className="text-muted-foreground text-sm mb-6">لا تتردد في طلب المساعدة إن احتجت إليها.</p>
              <Button asChild>
                <Link href="/requests/new">طلب مساعدة جديد</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myRequests.map(request => (
                <div key={request.id} className="relative">
                  <RequestCard request={request} />
                  <div className="absolute top-4 left-4 z-10">
                    {request.status === 'pending' && <Badge variant="secondary">قيد المراجعة</Badge>}
                    {request.status === 'approved' && <Badge className="bg-blue-500">نشط</Badge>}
                    {request.status === 'fulfilled' && <Badge className="bg-green-500">مكتمل</Badge>}
                    {request.status === 'rejected' && <Badge variant="destructive">مرفوض</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="helps" className="pt-6">
          {isLoadingHelps ? (
            <div className="text-center text-muted-foreground py-12">جاري التحميل...</div>
          ) : !myHelps?.length ? (
            <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
              <h3 className="text-lg font-medium mb-2">لم تقم بتقديم المساعدة بعد</h3>
              <p className="text-muted-foreground text-sm mb-6">تصفح الطلبات الحالية وابحث عمن يحتاج مساعدتك.</p>
              <Button asChild>
                <Link href="/">تصفح الحالات</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {myHelps.map(help => (
                <Card key={help.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          <Link href={`/requests/${help.request.id}`} className="hover:text-primary transition-colors">
                            {help.request.title}
                          </Link>
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          عُرضت المساعدة {formatDistanceToNow(new Date(help.createdAt), { addSuffix: true, locale: ar })}
                        </div>
                      </div>
                      <Badge variant={help.request.status === 'fulfilled' ? "default" : "secondary"} className={help.request.status === 'fulfilled' ? 'bg-green-500' : ''}>
                        {help.request.status === 'fulfilled' ? "اكتمل الطلب" : "في انتظار الرد"}
                      </Badge>
                    </div>
                  </CardHeader>
                  {help.message && (
                    <CardContent className="pt-4">
                      <p className="text-sm">
                        <span className="font-semibold text-muted-foreground">رسالتك: </span>
                        {help.message}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
