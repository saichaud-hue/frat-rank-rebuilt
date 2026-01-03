import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminParties } from "@/components/admin/AdminParties";
import { AdminComments } from "@/components/admin/AdminComments";
import { AdminPosts } from "@/components/admin/AdminPosts";
import { ChevronLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin</h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Moderation & Ops</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="parties" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="parties">Parties</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
              </TabsList>

              <TabsContent value="parties" className="mt-4">
                <AdminParties />
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                <AdminComments />
              </TabsContent>

              <TabsContent value="posts" className="mt-4">
                <AdminPosts />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
