import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  useGetRequest, getGetRequestQueryKey, useOfferHelp, 
  useListHelpers, getListHelpersQueryKey, useMarkFulfilled, 
  useReportRequest, HelpRequestCategory, getListRequestsQueryKey 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, CATEGORY_COLORS, URGENCY_LABELS, URGENCY_COLORS } from "@/components/request-card";
import { MapPin, Clock, Users, AlertTriangle, ShieldCheck, Phone, Mail, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// Images
import foodImg from "@/assets/images/food.png";
import medicineImg from "@/assets/images/medicine.png";
import clothesImg from "@/assets/images/clothes.png";
import rentImg from "@/assets/images/rent.png";

const CATEGORY_IMAGES: Partial<Record<HelpRequestCategory, string>> = {
  food: foodImg,
  medicine: medicineImg,
  clothes: clothesImg,
  rent: rentImg,
};

export default function RequestDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: request, isLoading } = useGetRequest(id);
  const isOwner = user && request && user.id === request.userId;
  
  const { data: helpers } = useListHelpers(id, {
    query: {
      queryKey: getListHelpersQueryKey(id),
      enabled: !!isOwner || user?.role === "admin",
    }
  });

  const offerHelp = useOfferHelp();
  const markFulfilled = useMarkFulfilled();
  const reportRequest = useReportRequest();

  const [helpMessage, setHelpMessage] = useState("");
  const [helpContact, setHelpContact] = useState("");
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);

  const [reportReason, setReportReason] = useState("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const handleOfferHelp = async () => {
    try {
      await offerHelp.mutateAsync({
        id,
        data: { message: helpMessage, contactInfo: helpContact }
      });
      toast.success("تم تقديم عرض المساعدة بنجاح");
      setIsHelpDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "حدث خطأ أثناء تقديم المساعدة");
    }
  };

  const handleMarkFulfilled = async () => {
    try {
      await markFulfilled.mutateAsync({ id });
      toast.success("تم تحديد الطلب كمكتمل");
      queryClient.invalidateQueries({ queryKey: getGetRequestQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "حدث خطأ");
    }
  };

  const handleReport = async () => {
    if (reportReason.length < 5) {
      toast.error("السبب يجب أن يكون 5 أحرف على الأقل");
      return;
    }
    try {
      await reportRequest.mutateAsync({ id, data: { reason: reportReason } });
      toast.success("تم إرسال البلاغ بنجاح");
      setIsReportDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "حدث خطأ");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!request) {
    return <div>الطلب غير موجود</div>;
  }

  const categoryColor = CATEGORY_COLORS[request.category];
  const bgImg = CATEGORY_IMAGES[request.category];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden min-h-[250px] flex flex-col justify-end p-6 border">
        {bgImg ? (
          <div className="absolute inset-0">
            <img src={bgImg} alt="" className="w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm`} />
          </div>
        ) : (
          <div className={`absolute inset-0 ${categoryColor} opacity-20`} />
        )}
        
        <div className="relative z-10 flex flex-col gap-4 text-white">
          <div className="flex gap-2">
            <Badge className="bg-primary/80 hover:bg-primary border-none">{CATEGORY_LABELS[request.category]}</Badge>
            <Badge variant="outline" className={`border-none ${URGENCY_COLORS[request.urgency]}`}>
              {URGENCY_LABELS[request.urgency]}
            </Badge>
            {request.status === "fulfilled" && (
              <Badge className="bg-green-500 hover:bg-green-600">مكتمل</Badge>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">{request.title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-6">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          <span>{request.city}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>نُشر {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ar })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          <span>{request.helpersCount} بادروا للمساعدة</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" />
          <span>بواسطة: {request.displayName || "مستعار"}</span>
        </div>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-lg leading-relaxed whitespace-pre-wrap">{request.description}</p>
      </div>

      {request.status !== "fulfilled" && (
        <div className="pt-6">
          {!user ? (
            <div className="bg-muted p-6 rounded-xl text-center space-y-4">
              <p>سجّل دخولك لتتمكن من المساعدة</p>
              <Button asChild>
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
            </div>
          ) : isOwner ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/20">
                <div>
                  <h3 className="font-bold text-primary">هذا طلبك</h3>
                  <p className="text-sm text-muted-foreground">عندما تتلقى المساعدة الكافية، قم بتحديد الطلب كمكتمل.</p>
                </div>
                <Button onClick={handleMarkFulfilled} disabled={markFulfilled.isPending}>
                  تمّت المساعدة
                </Button>
              </div>

              {helpers && helpers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold border-b pb-2">المساعدون ({helpers.length})</h3>
                  <div className="space-y-3">
                    {helpers.map(helper => (
                      <div key={helper.id} className="p-4 border rounded-xl bg-card">
                        <div className="font-bold">{helper.helperName}</div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          {helper.helperEmail && (
                            <div className="flex items-center gap-1"><Mail className="h-4 w-4"/> {helper.helperEmail}</div>
                          )}
                          {helper.helperPhone && (
                            <div className="flex items-center gap-1"><Phone className="h-4 w-4"/> {helper.helperPhone}</div>
                          )}
                        </div>
                        {helper.message && (
                          <div className="mt-3 p-3 bg-muted rounded-lg text-sm flex gap-2">
                            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>{helper.message}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full text-lg h-14">أريد المساعدة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تقديم المساعدة</DialogTitle>
                    <DialogDescription>
                      أدخل رسالة أو وسيلة تواصل إضافية ليتمكن صاحب الطلب من التواصل معك.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">رسالة (اختياري)</label>
                      <Textarea 
                        placeholder="كيف يمكنك المساعدة؟" 
                        value={helpMessage} 
                        onChange={e => setHelpMessage(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">معلومات تواصل إضافية (اختياري)</label>
                      <Input 
                        placeholder="رقم هاتف آخر أو حساب..." 
                        value={helpContact} 
                        onChange={e => setHelpContact(e.target.value)} 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleOfferHelp} disabled={offerHelp.isPending}>إرسال</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="text-center">
                <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1 w-full">
                      <AlertTriangle className="h-3 w-3" />
                      إبلاغ عن مخالفة
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>الإبلاغ عن الطلب</DialogTitle>
                      <DialogDescription>
                        يرجى توضيح سبب الإبلاغ ليقوم المشرفون بمراجعته.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Textarea 
                        placeholder="سبب البلاغ (٥ أحرف على الأقل)..." 
                        value={reportReason} 
                        onChange={e => setReportReason(e.target.value)} 
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="destructive" onClick={handleReport} disabled={reportRequest.isPending}>
                        إرسال البلاغ
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
