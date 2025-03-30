import { RoomModel } from "./Room"

test("can be created", () => {
  const instance = RoomModel.create({})

  expect(instance).toBeTruthy()
})

