"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CreateCardProps {
  submittedText: string
}

export function CreateCard({ submittedText }: CreateCardProps) {
  const { toast } = useToast()

  const handleSave = () => {
    toast({
      title: "Saved!",
      description: "Your content has been saved successfully.",
    })
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Generated Content</h2>
        </div>
        <Button onClick={handleSave} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Save
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Your Input</h3>
          <p className="text-lg font-medium">{submittedText}</p>
        </div>

        <div className="space-y-4">
          <p className="text-pretty leading-relaxed text-foreground">
            This is the first paragraph of generated content based on your input. It provides context and introduces the
            main ideas that will be explored in the following sections. The content is designed to be informative and
            engaging, capturing the essence of what you're looking to create.
          </p>

          <p className="text-pretty leading-relaxed text-foreground">
            The second paragraph expands on the initial concepts, diving deeper into the details and providing
            additional insights. It builds upon the foundation established in the first paragraph, offering a more
            comprehensive understanding of the topic at hand.
          </p>

          <p className="text-pretty leading-relaxed text-foreground">
            Finally, this third paragraph brings everything together, summarizing the key points and providing a
            cohesive conclusion. It ensures that the content feels complete and leaves the reader with a clear
            understanding of the subject matter discussed throughout.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
