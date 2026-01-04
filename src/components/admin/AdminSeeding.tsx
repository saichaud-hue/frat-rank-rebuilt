import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Party = {
  id: string;
  title: string | null;
  fraternity_id: string | null;
};

type Fraternity = {
  id: string;
  name: string;
};

export function AdminSeeding() {
  const queryClient = useQueryClient();
  
  // Rating seeding state
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [ratingCount, setRatingCount] = useState("5");
  const [minScore, setMinScore] = useState("6");
  const [maxScore, setMaxScore] = useState("10");
  const [ratingLoading, setRatingLoading] = useState(false);

  // Reputation rating seeding state
  const [selectedFrat, setSelectedFrat] = useState<string>("");
  const [repRatingCount, setRepRatingCount] = useState("5");
  const [repMinScore, setRepMinScore] = useState("6");
  const [repMaxScore, setRepMaxScore] = useState("10");
  const [repRatingLoading, setRepRatingLoading] = useState(false);

  // Post seeding state
  const [postText, setPostText] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  // Fetch parties and fraternities
  const { data } = useQuery({
    queryKey: ["admin", "seeding-data"],
    queryFn: async () => {
      const [partiesRes, fratsRes] = await Promise.all([
        supabase
          .from("parties")
          .select("id,title,fraternity_id")
          .in("status", ["upcoming", "live", "completed"])
          .order("starts_at", { ascending: false })
          .limit(50),
        supabase.from("fraternities").select("id,name").order("name"),
      ]);

      return {
        parties: (partiesRes.data ?? []) as Party[],
        fraternities: (fratsRes.data ?? []) as Fraternity[],
      };
    },
  });

  const parties = data?.parties ?? [];
  const fraternities = data?.fraternities ?? [];

  const generateRandomScore = (min: number, max: number) => {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  };

  const seedPartyRatings = async () => {
    if (!selectedParty) {
      toast.error("Please select a party");
      return;
    }

    const count = parseInt(ratingCount);
    const min = parseFloat(minScore);
    const max = parseFloat(maxScore);

    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Rating count must be between 1 and 100");
      return;
    }
    if (isNaN(min) || isNaN(max) || min < 1 || max > 10 || min > max) {
      toast.error("Scores must be between 1-10 and min <= max");
      return;
    }

    setRatingLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ratings = Array.from({ length: count }, () => ({
        party_id: selectedParty,
        user_id: user.id,
        vibe_score: generateRandomScore(min, max),
        music_score: generateRandomScore(min, max),
        execution_score: generateRandomScore(min, max),
        party_quality_score: generateRandomScore(min, max),
      }));

      const { error } = await supabase.from("party_ratings").insert(ratings);
      if (error) throw error;

      toast.success(`Added ${count} party ratings`);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add ratings");
    } finally {
      setRatingLoading(false);
    }
  };

  const seedReputationRatings = async () => {
    if (!selectedFrat) {
      toast.error("Please select a fraternity");
      return;
    }

    const count = parseInt(repRatingCount);
    const min = parseFloat(repMinScore);
    const max = parseFloat(repMaxScore);

    if (isNaN(count) || count < 1 || count > 100) {
      toast.error("Rating count must be between 1 and 100");
      return;
    }
    if (isNaN(min) || isNaN(max) || min < 1 || max > 10 || min > max) {
      toast.error("Scores must be between 1-10 and min <= max");
      return;
    }

    setRepRatingLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ratings = Array.from({ length: count }, () => {
        const brotherhood = generateRandomScore(min, max);
        const community = generateRandomScore(min, max);
        const reputation = generateRandomScore(min, max);
        const combined = (brotherhood + community + reputation) / 3;
        
        return {
          fraternity_id: selectedFrat,
          user_id: user.id,
          brotherhood_score: brotherhood,
          community_score: community,
          reputation_score: reputation,
          combined_score: Math.round(combined * 10) / 10,
        };
      });

      const { error } = await supabase.from("reputation_ratings").insert(ratings);
      if (error) throw error;

      toast.success(`Added ${count} reputation ratings`);
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to add reputation ratings");
    } finally {
      setRepRatingLoading(false);
    }
  };

  const seedPost = async () => {
    if (!postText.trim()) {
      toast.error("Please enter post text");
      return;
    }

    setPostLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("chat_messages").insert({
        text: postText.trim(),
        user_id: user.id,
      });
      if (error) throw error;

      toast.success("Post created");
      setPostText("");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create post");
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Party Ratings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Seed Party Ratings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Party</Label>
            <Select value={selectedParty} onValueChange={setSelectedParty}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a party" />
              </SelectTrigger>
              <SelectContent>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title || "Untitled"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Count</Label>
              <Input
                type="number"
                value={ratingCount}
                onChange={(e) => setRatingCount(e.target.value)}
                className="h-9"
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label className="text-xs">Min Score</Label>
              <Input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
            <div>
              <Label className="text-xs">Max Score</Label>
              <Input
                type="number"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
          </div>

          <Button 
            onClick={seedPartyRatings} 
            disabled={ratingLoading}
            size="sm"
            className="w-full"
          >
            {ratingLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Ratings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Reputation Ratings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Seed Reputation Ratings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Fraternity</Label>
            <Select value={selectedFrat} onValueChange={setSelectedFrat}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a fraternity" />
              </SelectTrigger>
              <SelectContent>
                {fraternities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Count</Label>
              <Input
                type="number"
                value={repRatingCount}
                onChange={(e) => setRepRatingCount(e.target.value)}
                className="h-9"
                min={1}
                max={100}
              />
            </div>
            <div>
              <Label className="text-xs">Min Score</Label>
              <Input
                type="number"
                value={repMinScore}
                onChange={(e) => setRepMinScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
            <div>
              <Label className="text-xs">Max Score</Label>
              <Input
                type="number"
                value={repMaxScore}
                onChange={(e) => setRepMaxScore(e.target.value)}
                className="h-9"
                min={1}
                max={10}
                step={0.1}
              />
            </div>
          </div>

          <Button 
            onClick={seedReputationRatings} 
            disabled={repRatingLoading}
            size="sm"
            className="w-full"
          >
            {repRatingLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add Reputation Ratings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Posts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Create Post
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Post Text</Label>
            <Textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="Enter post content..."
              rows={3}
            />
          </div>

          <Button 
            onClick={seedPost} 
            disabled={postLoading}
            size="sm"
            className="w-full"
          >
            {postLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Create Post
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
