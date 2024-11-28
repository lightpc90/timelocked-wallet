
import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";
// import { initSimnet, tx } from "@hirosystems/clarinet-sdk";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const randowm_user = accounts.get("wallet_2")!;
const another_beneficiary = Cl.standardPrincipal(accounts.get("wallet_3")!);

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/stacks/clarinet-js-sdk
*/

describe("testing timelocked-wallet", () => {
  const _beneficiary = accounts.get("wallet_1")!;
  const beneficiary = Cl.standardPrincipal(accounts.get("wallet_1")!);
  const block_at = Cl.uint(10);
  const amount = Cl.uint(1000);
  it("lock call should be successful", () => {
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    console.log("lock events: ", Cl.prettyPrint(lock.result))

    // call successful
    expect(lock.result).toBeOk(Cl.bool(true));

    // block expiration was set
    const unlock_height = simnet.getDataVar("timelocked-wallet", "unlock-height");
    console.log("unlock height: ", Cl.prettyPrint(unlock_height));
    expect(unlock_height).toBeUint(10);
  });

  it("Does not allow anyone else to lock", () => {
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], randowm_user);
    // console.log("lock result: ", cvToValue(lock.result))
    expect(lock.result).toBeErr(Cl.uint(100));
  });

  it("Cannot lock more than once", () => {
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    const lock_again = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    expect(lock.result).toBeOk(Cl.bool(true));
    expect(lock_again.result).toBeErr(Cl.uint(101));
  });

  it("unlock block height cannot be in the past", () => {
    // mine empty blocks to put block_at in the past
    simnet.mineEmptyBlocks(11);
    // call lock function
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    expect(lock.result).toBeErr(Cl.uint(102));
  });

  it("Allows the beneficiary to bestow the right to claim to someone else", () => {
    // call lock function first to set the beneficiary
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    const bestow = simnet.callPublicFn("timelocked-wallet", "bestow", [another_beneficiary], _beneficiary);
    expect(lock.result).toBeOk(Cl.bool(true));
    expect(bestow.result).toBeOk(Cl.bool(true));
  });

  it("Does not allow anyone else to bestow the right to claim to someone else, not even contract owner", () => {
    // call lock function first to set the beneficiary
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    const bestow = simnet.callPublicFn("timelocked-wallet", "bestow", [another_beneficiary], simnet.deployer);
    const bestow2 = simnet.callPublicFn("timelocked-wallet", "bestow", [another_beneficiary], randowm_user);
    expect(lock.result).toBeOk(Cl.bool(true));
    expect(bestow.result).toBeErr(Cl.uint(104));
    expect(bestow2.result).toBeErr(Cl.uint(104));
  });

  it("Allow the beneficiary to claim when the block-height is reached", () => {
    // call lock function first to set the beneficiary
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    // adcvance the block height
    simnet.mineEmptyBlocks(10);
    // call claim function
    const claim = simnet.callPublicFn("timelocked-wallet", "claim", [], _beneficiary);
    expect(lock.result).toBeOk(Cl.bool(true));
    expect(claim.result).toBeOk(Cl.bool(true));
  });

  it("Does not allow the beneficiary to claim before the block-height is reached", () => {
    // call lock function first to set the beneficiary
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    // advance the block height to a height before the block_at
    // simnet.mineEmptyBlocks(6);

    // call claim function
    const claim = simnet.callPublicFn("timelocked-wallet", "claim", [], _beneficiary);
    expect(lock.result).toBeOk(Cl.bool(true));
    expect(claim.result).toBeErr(Cl.uint(105));
  });

  it("Does not allow anyone else to claim even when the block-height is reached", () => {
    // call lock function first to set the beneficiary
    const lock = simnet.callPublicFn("timelocked-wallet", "lock", [beneficiary, block_at, amount], simnet.deployer);
    // advance the block height to the block_at
    simnet.mineEmptyBlocks(10);
    // call claim function
    const claim = simnet.callPublicFn("timelocked-wallet", "claim", [], randowm_user);
    expect(lock.result).toBeOk(Cl.bool(true));
    expect(claim.result).toBeErr(Cl.uint(104));
  });
});
