import { 
  useAdminGetStats, useAdminListRequests, useAdminUpdateRequestStatus, 
  useAdminDeleteRequest, useAdminListUsers, useAdminUpdateUserTrust, 
  useAdminListReports, getAdminListRequestsQueryKey, getAdminGetStatsQueryKey,
  getAdminListUsersQueryKey, getAdminListReportsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { Users, Activity, CheckCircle, FileWarning, Trash2 } from "lucide-react";

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: stats } = useAdminGetStats();
  
  const { data: pendingRequests } = useAdminListRequests({ status: "pending" });
  const { data: allRequests } = useAdminListRequests();
  const { data: users } = useAdminListUsers();
  const { data: reports } = useAdminListReports();

  const updateRequestStatus = useAdminUpdateRequestStatus();
  const deleteRequest = useAdminDeleteRequest();
  const updateUserTrust = useAdminUpdateUserTrust();

  const handleStatusChange = async (id: number, status: "approved" | "rejected") => {
    try {
      await updateRequestStatus.mutateAsync({ id, data: { status } });
      toast.success("تم تحديث حالة الطلب");
      queryClient.invalidateQueries({ queryKey: getAdminListRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
    } catch (e: any) {
      toast.error("حدث خطأ");
    }
  };

  const handleDeleteRequest = async (id: number) => {
    try {
      await deleteRequest.mutateAsync({ id });
      toast.success("تم حذف الطلب");
      queryClient.invalidateQueries({ queryKey: getAdminListRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
    } catch (e: any) {
      toast.error("حدث خطأ");
    }
  };

  const handleTrustChange = async (userId: number, trustStatus: "new" | "trusted" | "restricted") => {
    try {
      await updateUserTrust.mutateAsync({ id: userId, data: { trustStatus } });
      toast.success("تم تحديث موثوقية المستخدم");
      queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
    } catch (e: any) {
      toast.error("حدث خطأ");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">لوحة الإدارة</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">قيد المراجعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-500" />
                {stats.pendingRequests}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الطلبات النشطة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                {stats.approvedRequests}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">مكتملة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {stats.fulfilledRequests}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">المستخدمون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {stats.totalUsers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">البلاغات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                {stats.totalReports}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList className="bg-muted">
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="all">كل الطلبات</TabsTrigger>
          <TabsTrigger value="users">المستخدمون</TabsTrigger>
          <TabsTrigger value="reports">البلاغات</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="pt-4 space-y-4">
          {pendingRequests?.length === 0 && <div className="text-muted-foreground p-4 text-center">لا توجد طلبات قيد المراجعة</div>}
          {pendingRequests?.map(req => (
            <Card key={req.id}>
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                <div>
                  <h3 className="font-bold"><Link href={`/requests/${req.id}`} className="hover:underline">{req.title}</Link></h3>
                  <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <span>الناشر: {req.userName} ({req.userEmail})</span>
                    <Badge variant="outline" className={req.userTrustStatus === 'new' ? 'text-amber-600' : ''}>
                      {req.userTrustStatus === 'new' ? 'جديد' : req.userTrustStatus === 'trusted' ? 'موثوق' : 'مقيد'}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{req.description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(req.id, "approved")}>قبول</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleStatusChange(req.id, "rejected")}>رفض</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>هل أنت متأكد من رغبتك بحذف هذا الطلب نهائياً؟</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteRequest(req.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="pt-4">
          <div className="border rounded-md">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 font-medium">العنوان</th>
                  <th className="p-3 font-medium">الناشر</th>
                  <th className="p-3 font-medium">تاريخ النشر</th>
                  <th className="p-3 font-medium">الحالة</th>
                  <th className="p-3 font-medium">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allRequests?.map(req => (
                  <tr key={req.id}>
                    <td className="p-3 max-w-[200px] truncate"><Link href={`/requests/${req.id}`} className="hover:underline">{req.title}</Link></td>
                    <td className="p-3">{req.userName}</td>
                    <td className="p-3 text-muted-foreground">{formatDistanceToNow(new Date(req.createdAt), { locale: ar })}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={
                        req.status === 'approved' ? 'bg-blue-500/10 text-blue-700' :
                        req.status === 'fulfilled' ? 'bg-green-500/10 text-green-700' :
                        req.status === 'rejected' ? 'bg-red-500/10 text-red-700' : ''
                      }>
                        {req.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                            <AlertDialogDescription>هل أنت متأكد من رغبتك بحذف هذا الطلب نهائياً؟</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteRequest(req.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="users" className="pt-4">
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 font-medium">الاسم</th>
                  <th className="p-3 font-medium">البريد</th>
                  <th className="p-3 font-medium">الطلبات</th>
                  <th className="p-3 font-medium">المساعدات</th>
                  <th className="p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.map(u => (
                  <tr key={u.id}>
                    <td className="p-3 font-medium">{u.name} {u.role === 'admin' && <Badge className="ml-2 py-0 h-5">مدير</Badge>}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">{u.requestsCount}</td>
                    <td className="p-3">{u.helpActionsCount}</td>
                    <td className="p-3">
                      {u.role !== 'admin' && (
                        <Select defaultValue={u.trustStatus} onValueChange={(val: any) => handleTrustChange(u.id, val)}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">جديد</SelectItem>
                            <SelectItem value="trusted">موثوق</SelectItem>
                            <SelectItem value="restricted">مقيد</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="pt-4 space-y-4">
          {reports?.length === 0 && <div className="text-muted-foreground p-4 text-center">لا توجد بلاغات</div>}
          {reports?.map(report => (
            <Card key={report.id} className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileWarning className="h-5 w-5 text-red-500 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-bold">
                      تبليغ على: <Link href={`/requests/${report.requestId}`} className="text-primary hover:underline">{report.requestTitle}</Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">بواسطة: {report.reporterName} • منذ {formatDistanceToNow(new Date(report.createdAt), { locale: ar })}</p>
                    <p className="mt-3 text-sm">{report.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
