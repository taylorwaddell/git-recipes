import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const mockResults = [
  {
    id: 1,
    title: "Modern Architecture",
    subtitle: "Contemporary design patterns",
    image: "/modern-architecture-cityscape.png",
  },
  {
    id: 2,
    title: "Digital Innovation",
    subtitle: "Technology and creativity",
    image: "/digital-innovation.png",
  },
  {
    id: 3,
    title: "Creative Solutions",
    subtitle: "Problem-solving approaches",
    image: "/creative-solutions.jpg",
  },
  {
    id: 4,
    title: "Future Vision",
    subtitle: "Tomorrow's possibilities",
    image: "/future-vision.png",
  },
  {
    id: 5,
    title: "Design Systems",
    subtitle: "Scalable frameworks",
    image: "/design-systems.png",
  },
  {
    id: 6,
    title: "User Experience",
    subtitle: "Human-centered design",
    image: "/user-experience.jpg",
  },
]

export function ResultsGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {mockResults.map((result) => (
        <Card key={result.id} className="overflow-hidden transition-all hover:shadow-lg">
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={result.image || "/placeholder.svg"}
              alt={result.title}
              className="h-full w-full object-cover transition-transform hover:scale-105"
            />
          </div>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">{result.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
