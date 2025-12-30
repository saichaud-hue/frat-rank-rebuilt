import { Star } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Fraternity {
  id: string;
  name: string;
  letters?: string;
  logo_url?: string;
}

interface FratPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fraternity: Fraternity) => void;
  fraternities: Fraternity[];
}

export default function FratPickerSheet({ isOpen, onClose, onSelect, fraternities }: FratPickerSheetProps) {
  const handleSelect = (frat: Fraternity) => {
    onClose();
    onSelect(frat);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[70vh]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-xl">Choose a Frat to Rate</SheetTitle>
          <p className="text-sm text-muted-foreground">Tap to select and rate</p>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-120px)] -mx-2 px-2">
          <div className="space-y-2 pb-4">
            {fraternities.map((frat) => (
              <button
                key={frat.id}
                onClick={() => handleSelect(frat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all text-left"
              >
                <Avatar className="h-12 w-12 rounded-xl">
                  <AvatarImage src={frat.logo_url} alt={frat.name} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                    {frat.letters?.substring(0, 2) || frat.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{frat.name}</p>
                  {frat.letters && (
                    <p className="text-sm text-muted-foreground">{frat.letters}</p>
                  )}
                </div>
                <Star className="h-5 w-5 text-amber-500" />
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
