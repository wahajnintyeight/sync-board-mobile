import { SocketStoreModel } from "./SocketStore"

test("can be created", () => {
  const instance = SocketStoreModel.create({})

  expect(instance).toBeTruthy()
})

