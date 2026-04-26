import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateRequest, getListRequestsQueryKey, getListMyRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

const formSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  displayName: z.string().optional(),
  category: z.enum(["food", "medicine", "clothes", "rent", "other"], { required_error: "يرجى اختيار التصنيف" }),
  city: z.string({ required_error: "يرجى اختيار المدينة" }),
  urgency: z.enum(["low", "medium", "high"], { required_error: "يرجى تحديد مستوى الأهمية" }),
  imageUrl: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")),
});

const CITIES = ["الرياض", "جدة", "مكة", "الدمام", "المدينة", "الخبر", "تبوك", "أبها", "الطائف", "حائل"];

export default function NewRequest() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createRequest = useCreateRequest();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      displayName: "",
      urgency: "medium",
      imageUrl: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createRequest.mutateAsync({
        data: {
          title: values.title,
          description: values.description,
          displayName: values.displayName || undefined,
          category: values.category,
          city: values.city,
          urgency: values.urgency,
          imageUrl: values.imageUrl || undefined,
        }
      });
      
      toast.success("تم نشر طلبك بنجاح");
      queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListMyRequestsQueryKey() });
      setLocation("/me");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "حدث خطأ أثناء نشر الطلب");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">نشر طلب مساعدة</h1>
        <p className="text-muted-foreground mt-2">قم بوصف حالتك بوضوح ليتمكن جيرانك من مساعدتك.</p>
      </div>

      {user?.trustStatus === "new" && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-500">ملاحظة هامة للمستخدمين الجدد</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-amber-700/80 dark:text-amber-600/80">
              بما أن حسابك جديد، سيخضع طلبك لمراجعة سريعة من قبل الإدارة قبل نشره للعامة للتأكد من الموثوقية.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الطلب</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: بحاجة إلى أدوية ضغط عاجلة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التصنيف</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر التصنيف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="food">طعام</SelectItem>
                          <SelectItem value="medicine">دواء</SelectItem>
                          <SelectItem value="clothes">ملابس</SelectItem>
                          <SelectItem value="rent">إيجار</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المدينة</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المدينة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CITIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التفاصيل</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="اشرح حالتك واحتياجك بالتفصيل..." 
                        className="min-h-[120px] resize-y"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>مستوى الأهمية</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-4"
                      >
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="low" className="sr-only" />
                          </FormControl>
                          <FormLabel className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${field.value === 'low' ? 'border-primary' : ''}`}>
                            <span className="font-bold">عادي</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="medium" className="sr-only" />
                          </FormControl>
                          <FormLabel className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${field.value === 'medium' ? 'border-primary' : ''}`}>
                            <span className="font-bold">مهم</span>
                          </FormLabel>
                        </FormItem>
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="high" className="sr-only" />
                          </FormControl>
                          <FormLabel className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${field.value === 'high' ? 'border-destructive text-destructive' : ''}`}>
                            <span className="font-bold">عاجل</span>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم المستعار (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="اسم العرض أو اتركه فارغاً" {...field} />
                      </FormControl>
                      <FormDescription>سيظهر هذا الاسم للعامة بدلاً من اسمك الحقيقي.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط صورة (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation("/")}>إلغاء</Button>
                <Button type="submit" disabled={createRequest.isPending}>
                  {createRequest.isPending ? "جاري النشر..." : "نشر الطلب"}
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
