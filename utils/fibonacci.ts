export function fibonacciSphere(count: number, radius: number) {
  const points = []
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < count; i++) {
    const theta = Math.acos(1 - (2 * i + 1) / count)
    const phi = 2 * Math.PI * i / goldenRatio
    points.push({
      x: radius * Math.sin(theta) * Math.cos(phi),
      y: radius * Math.cos(theta),
      z: radius * Math.sin(theta) * Math.sin(phi)
    })
  }
  return points
}
